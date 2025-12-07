
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// Helper function to get Google Sheets API client
async function getSheetsClient() {
    const credentialsString = process.env.GOOGLE_CREDENTIALS;
    if (!credentialsString) {
        throw new Error('GOOGLE_CREDENTIALS environment variable is not set.');
    }
    
    // credentials can be a string or an object, handle both.
    const credentials = typeof credentialsString === 'string' 
        ? JSON.parse(credentialsString) 
        : credentialsString;
    
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

const SPREADSHEET_ID = process.env.SHEET_ID;
const RANGE = '시트1!A:G'; // Assuming data is in columns A to G

// GET: Fetch all rows for debugging
export async function GET() {
    try {
        if (!SPREADSHEET_ID) {
            throw new Error('SHEET_ID environment variable is not set.');
        }
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE,
        });

        const rows = response.data.values;
        
        if (!rows || rows.length === 0) {
            return NextResponse.json({ data: [] });
        }
        
        // Just return the raw data for now to debug
        return NextResponse.json({ data: rows });

    } catch (error: any) {
        console.error('Error fetching from Google Sheets:', error);
        // Ensure a valid JSON response is always sent, even on error
        return NextResponse.json({ error: error.message || 'Failed to fetch data from Google Sheets' }, { status: 500 });
    }
}

// POST: Update a row in the sheet
export async function POST(request: Request) {
    try {
         if (!SPREADSHEET_ID) {
            throw new Error('SHEET_ID environment variable is not set.');
        }
        const { rowNumber, column, value } = await request.json();

        if (!rowNumber || !column || value === undefined) {
            return NextResponse.json({ error: 'rowNumber, column, and value are required' }, { status: 400 });
        }
        
        const sheets = await getSheetsClient();

        // Convert column name to letter
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: '시트1!1:1',
        });

        if (!headerResponse.data.values) {
            throw new Error("Could not read sheet header.");
        }

        const colIndex = headerResponse.data.values[0].indexOf(column);
        if (colIndex === -1) {
             return NextResponse.json({ error: `Column '${column}' not found` }, { status: 400 });
        }
        const colLetter = String.fromCharCode('A'.charCodeAt(0) + colIndex);
        const updateRange = `시트1!${colLetter}${rowNumber}`;

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: updateRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[value]],
            },
        });

        return NextResponse.json({ success: true, message: `Row ${rowNumber} updated successfully.` });

    } catch (error: any) {
        console.error('Error updating Google Sheets:', error);
        return NextResponse.json({ error: error.message || 'Failed to update Google Sheets' }, { status: 500 });
    }
}
