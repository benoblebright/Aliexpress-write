
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

async function getSheetsClient() {
    const credentialsString = process.env.GOOGLE_CREDENTIALS;
    if (!credentialsString) {
        throw new Error("GOOGLE_CREDENTIALS environment variable not set.");
    }
    
    const credentials = JSON.parse(credentialsString);

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    return sheets;
}

const SPREADSHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = 'data';

export async function GET() {
    try {
        const sheets = await getSheetsClient();
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: SHEET_NAME,
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) { 
            return NextResponse.json({ data: [] });
        }

        const header = rows[0];
        const data = rows.slice(1).map((row, index) => {
            const rowData: { [key: string]: any } = { rowNumber: index + 2 }; 
            header.forEach((key, i) => {
                rowData[key] = row[i] !== undefined && row[i] !== null ? row[i] : '';
            });
            return rowData;
        });

        const filteredAndSortedData = data
            .filter(item => item.checkup === '0') 
            .sort((a, b) => {
                const dateA = a.Runtime ? new Date(a.Runtime).getTime() : 0;
                const dateB = b.Runtime ? new Date(b.Runtime).getTime() : 0;
                return dateB - dateA;
            });

        return NextResponse.json({ data: filteredAndSortedData });

    } catch (error: any) {
        console.error('Error fetching sheet data:', error);
        return NextResponse.json({ error: 'Failed to fetch sheet data', details: error.message || error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { rowNumber, newValues } = await request.json();

        if (!rowNumber || !newValues) {
            return NextResponse.json({ error: 'Missing rowNumber or newValues' }, { status: 400 });
        }

        const sheets = await getSheetsClient();
        
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!1:1`,
        });
        
        let headers = headerResponse.data.values?.[0];
        if (!headers) {
             return NextResponse.json({ error: 'Could not read sheet headers' }, { status: 500 });
        }

        const updates = [];
        const newColumns = [];

        // Find columns for existing values
        for (const key in newValues) {
            const columnIndex = headers.indexOf(key);
            if (columnIndex !== -1) {
                const columnLetter = String.fromCharCode('A'.charCodeAt(0) + columnIndex);
                updates.push({
                    range: `${SHEET_NAME}!${columnLetter}${rowNumber}`,
                    values: [[newValues[key]]],
                });
            } else {
                newColumns.push(key);
            }
        }
        
        // Append new columns to the header if they don't exist
        if (newColumns.length > 0) {
            const lastColumnIndex = headers.length;
            const lastColumnLetter = String.fromCharCode('A'.charCodeAt(0) + lastColumnIndex -1);
            
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!${String.fromCharCode(lastColumnLetter.charCodeAt(0) + 1)}1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [newColumns],
                },
            });
            
            // Add new values to the new columns for the specific row
            newColumns.forEach((key, index) => {
                 const newColumnIndex = lastColumnIndex + index;
                 const columnLetter = String.fromCharCode('A'.charCodeAt(0) + newColumnIndex);
                 updates.push({
                    range: `${SHEET_NAME}!${columnLetter}${rowNumber}`,
                    values: [[newValues[key]]],
                });
            });
        }


        if (updates.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    valueInputOption: 'USER_ENTERED',
                    data: updates,
                },
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error updating sheet data:', error);
        return NextResponse.json({ error: 'Failed to update sheet data', details: error.message || error }, { status: 500 });
    }
}
