
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Function to get authenticated Google Sheets client
async function getSheetsClient() {
    const credentialsString = process.env.GOOGLE_CREDENTIALS;
    if (!credentialsString) {
        throw new Error("GOOGLE_CREDENTIALS environment variable not set.");
    }
    
    // The credentials may be a string or an object. The `fromJSON` method handles both.
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

export async function GET() {
    try {
        const sheets = await getSheetsClient();
        
        // First, get spreadsheet metadata to find the actual title of the first sheet (gid=0)
        const spreadsheetMeta = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID
        });

        const firstSheet = spreadsheetMeta.data.sheets?.find(s => s.properties?.sheetId === 0);
        const sheetTitle = firstSheet?.properties?.title;

        if (!sheetTitle) {
            return NextResponse.json({ error: 'Failed to find the first sheet (gid=0) in the spreadsheet.' }, { status: 404 });
        }
        
        const RANGE = `${sheetTitle}!A:J`; // Dynamically construct the range

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return NextResponse.json({ data: [] });
        }

        const header = rows[0];
        const data = rows.slice(1).map((row, index) => {
            const rowData: { [key: string]: any } = { rowNumber: index + 2 }; // +2 because sheet is 1-based and header is skipped
            header.forEach((key, i) => {
                rowData[key] = row[i];
            });
            return rowData;
        });

        const filteredAndSortedData = data
            .filter(item => item.checkup === '0')
            .sort((a, b) => new Date(b.Runtime).getTime() - new Date(a.Runtime).getTime());

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
        
        // Find sheet title dynamically for POST as well
        const spreadsheetMeta = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID
        });
        const firstSheet = spreadsheetMeta.data.sheets?.find(s => s.properties?.sheetId === 0);
        const sheetTitle = firstSheet?.properties?.title;

        if (!sheetTitle) {
            return NextResponse.json({ error: 'Failed to find the first sheet (gid=0) for updating.' }, { status: 404 });
        }
        
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetTitle}!1:1`,
        });
        
        const headers = headerResponse.data.values?.[0];
        if (!headers) {
             return NextResponse.json({ error: 'Could not read sheet headers' }, { status: 500 });
        }
        
        const updates = Object.keys(newValues).map(key => {
            const columnIndex = headers.indexOf(key);
            if (columnIndex === -1) {
                return null;
            }
            const columnLetter = String.fromCharCode('A'.charCodeAt(0) + columnIndex);
            return {
                range: `${sheetTitle}!${columnLetter}${rowNumber}`,
                values: [[newValues[key]]],
            };
        }).filter(update => update !== null);

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No valid columns to update' }, { status: 400 });
        }
        
        const batchUpdateResponse = await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: 'USER_ENTERED',
                data: updates as any,
            },
        });

        return NextResponse.json({ success: true, response: batchUpdateResponse.data });

    } catch (error: any) {
        console.error('Error updating sheet data:', error);
        return NextResponse.json({ error: 'Failed to update sheet data', details: error.message || error }, { status: 500 });
    }
}
