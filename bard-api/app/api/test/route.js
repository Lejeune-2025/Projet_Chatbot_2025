import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

const getCorsHeaders = (origin) => ({
    'Access-Control-Allow-Origin': origin || 'http://localhost:8081',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true'
});

export async function OPTIONS(request) {
    const origin = request.headers.get('origin');
    logger.info('Test OPTIONS request from origin:', origin);
    return NextResponse.json({}, { headers: getCorsHeaders(origin) });
}

export async function GET(request) {
    const origin = request.headers.get('origin');
    logger.info('Test GET request from origin:', origin);
    
    return NextResponse.json(
        { 
            status: 'ok',
            message: 'Server is accessible',
            timestamp: new Date().toISOString(),
            origin: origin
        },
        { headers: getCorsHeaders(origin) }
    );
} 