
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
const SHEET_NAME = 'data'; // Use the correct sheet name

export async function GET() {
    try {
        const sheets = await getSheetsClient();
        
        // Fetch all data from the sheet without specifying columns to be future-proof.
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: SHEET_NAME,
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) { // Need at least a header and one data row
            return NextResponse.json({ data: [] });
        }

        const header = rows[0];
        const data = rows.slice(1).map((row, index) => {
            const rowData: { [key: string]: any } = { rowNumber: index + 2 }; // +2 because sheet is 1-based and header is skipped
            header.forEach((key, i) => {
                // Ensure row has a value for this column, otherwise default to empty string
                rowData[key] = row[i] !== undefined && row[i] !== null ? row[i] : '';
            });
            return rowData;
        });

        const filteredAndSortedData = data
            .filter(item => item.checkup === '0') // Compare with string '0'
            .sort((a, b) => {
                // Handle cases where Runtime might be missing or invalid
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
        
        // Fetch header row to dynamically find column index
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!1:1`,
        });
        
        const headers = headerResponse.data.values?.[0];
        if (!headers) {
             return NextResponse.json({ error: 'Could not read sheet headers' }, { status: 500 });
        }
        
        // Create update requests based on column names
        const updates = Object.keys(newValues).map(key => {
            const columnIndex = headers.indexOf(key);
            if (columnIndex === -1) {
                // If the column name from newValues is not in the header, skip it
                return null;
            }
            // Convert 0-based column index to A1 notation letter
            const columnLetter = String.fromCharCode('A'.charCodeAt(0) + columnIndex);
            return {
                range: `${SHEET_NAME}!${columnLetter}${rowNumber}`,
                values: [[newValues[key]]],
            };
        }).filter(update => update !== null); // Filter out any nulls for columns not found

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
