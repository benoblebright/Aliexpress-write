
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// Helper function to get Google Sheets API client
async function getSheetsClient() {
    try {
        const credentialsString = process.env.GOOGLE_CREDENTIALS;
        if (!credentialsString) {
            throw new Error('GOOGLE_CREDENTIALS environment variable is not set.');
        }

        // Let the google-auth-library handle the parsing.
        // It's more robust against formatting issues in the env variable.
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(credentialsString),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const authClient = await auth.getClient();
        return google.sheets({ version: 'v4', auth: authClient });
    } catch (error: any) {
        // This will catch errors from parsing credentials or getting the client
        console.error('Error in getSheetsClient:', error);
        throw new Error(`Failed to create Sheets client: ${error.message}`);
    }
}

const SPREADSHEET_ID = process.env.SHEET_ID;
const RANGE = '시트1!A:G'; // Assuming data is in columns A to G

// GET: Fetch all rows
export async function GET() {
    try {
        if (!SPREADSHEET_ID) {
            return NextResponse.json({ error: 'SHEET_ID environment variable is not set.' }, { status: 500 });
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
        
        const header = rows[0];
        const data = rows
            .slice(1)
            .map((row, index) => {
                const rowData: { [key: string]: string | number } = {
                    // Correct row number is crucial. index + 2 because sheets are 1-based and we slice(1) for the header.
                    rowNumber: index + 2 
                };
                header.forEach((key, i) => {
                    rowData[key] = row[i];
                });
                return rowData;
            })
            .filter(row => row.checkup === '0')
            .sort((a, b) => {
                const dateA = new Date(a.Runtime as string).getTime();
                const dateB = new Date(b.Runtime as string).getTime();
                return dateB - dateA; // Sort in descending order (newest first)
            });

        return NextResponse.json({ data });

    } catch (error: any) {
        console.error('Error in GET /api/sheets:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch data from Google Sheets' }, { status: 500 });
    }
}

// POST: Update a row in the sheet
export async function POST(request: Request) {
    try {
         if (!SPREADSHEET_ID) {
            return NextResponse.json({ error: 'SHEET_ID environment variable is not set.' }, { status: 500 });
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
