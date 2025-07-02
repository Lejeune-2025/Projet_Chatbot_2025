import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export const compressMessage = async (message) => {
    try {
        const buffer = Buffer.from(message, 'utf8');
        const compressed = await gzip(buffer);
        return compressed.toString('base64');
    } catch (error) {
        console.error('Error compressing message:', error);
        return message; // Retourner le message original en cas d'erreur
    }
};

export const decompressMessage = async (compressedMessage) => {
    try {
        const buffer = Buffer.from(compressedMessage, 'base64');
        const decompressed = await gunzip(buffer);
        return decompressed.toString('utf8');
    } catch (error) {
        console.error('Error decompressing message:', error);
        return compressedMessage; // Retourner le message compressé en cas d'erreur
    }
}; 