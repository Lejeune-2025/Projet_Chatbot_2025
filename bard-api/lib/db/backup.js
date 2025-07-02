import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseBackup {
    constructor() {
        this.backupDir = path.join(__dirname, '../../backups');
        this.retentionDays = process.env.BACKUP_RETENTION_DAYS || 7;
    }

    // Créer un backup
    async createBackup() {
        try {
            // Créer le répertoire de backup s'il n'existe pas
            if (!fs.existsSync(this.backupDir)) {
                fs.mkdirSync(this.backupDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup_${timestamp}.sql`;
            const filepath = path.join(this.backupDir, filename);

            // Commande pg_dump
            const command = `pg_dump -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USER} -F c -b -v -f "${filepath}" ${process.env.DB_NAME}`;

            // Exécuter le backup
            await execAsync(command, {
                env: {
                    ...process.env,
                    PGPASSWORD: process.env.DB_PASSWORD
                }
            });

            logger.info(`Backup created successfully: ${filename}`);

            // Nettoyer les anciens backups
            await this.cleanOldBackups();

            return filepath;
        } catch (error) {
            logger.error('Error creating backup:', error);
            throw error;
        }
    }

    // Restaurer un backup
    async restoreBackup(backupFile) {
        try {
            const filepath = path.join(this.backupDir, backupFile);
            
            if (!fs.existsSync(filepath)) {
                throw new Error(`Backup file not found: ${backupFile}`);
            }

            // Commande pg_restore
            const command = `pg_restore -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -v "${filepath}"`;

            // Exécuter la restauration
            await execAsync(command, {
                env: {
                    ...process.env,
                    PGPASSWORD: process.env.DB_PASSWORD
                }
            });

            logger.info(`Backup restored successfully: ${backupFile}`);
        } catch (error) {
            logger.error('Error restoring backup:', error);
            throw error;
        }
    }

    // Nettoyer les anciens backups
    async cleanOldBackups() {
        try {
            const files = fs.readdirSync(this.backupDir);
            const now = new Date();

            for (const file of files) {
                const filepath = path.join(this.backupDir, file);
                const stats = fs.statSync(filepath);
                const daysOld = (now - stats.mtime) / (1000 * 60 * 60 * 24);

                if (daysOld > this.retentionDays) {
                    fs.unlinkSync(filepath);
                    logger.info(`Deleted old backup: ${file}`);
                }
            }
        } catch (error) {
            logger.error('Error cleaning old backups:', error);
            throw error;
        }
    }

    // Lister les backups disponibles
    listBackups() {
        try {
            if (!fs.existsSync(this.backupDir)) {
                return [];
            }

            return fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('backup_'))
                .map(file => {
                    const stats = fs.statSync(path.join(this.backupDir, file));
                    return {
                        filename: file,
                        size: stats.size,
                        created: stats.mtime
                    };
                })
                .sort((a, b) => b.created - a.created);
        } catch (error) {
            logger.error('Error listing backups:', error);
            throw error;
        }
    }
}

// Créer une instance unique
const backup = new DatabaseBackup();

// Exécuter le backup si le script est appelé directement
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (process.argv[2] === 'restore' && process.argv[3]) {
        backup.restoreBackup(process.argv[3])
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    } else {
        backup.createBackup()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    }
}

export default backup; 