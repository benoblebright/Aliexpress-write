
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// Type definition for a sheet row
interface SheetRow {
    rowNumber: number;
    상품명: string;
    URL: string;
    Runtime: string;
    사이트: string;
    가격: string;
    checkup: string;
}

// Helper function to get Google Sheets API client
async function getSheetsClient() {
    if (!process.env.GOOGLE_CREDENTIALS) {
        throw new Error('GOOGLE_CREDENTIALS environment variable is not set.');
    }
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

const SPREADSHEET_ID = process.env.SHEET_ID;
const RANGE = '시트1!A:G'; // Assuming data is in columns A to G

// GET: Fetch rows where checkup is '0'
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
        if (!rows || rows.length < 2) { // Need at least a header and one data row
            return NextResponse.json({ data: [] });
        }

        // Assuming the first row is the header
        const header = rows[0] as string[];
        const checkupIndex = header.indexOf('checkup');
        
        if (checkupIndex === -1) {
            throw new Error("'checkup' column not found in the sheet.");
        }
        
        const allData: SheetRow[] = rows
            .slice(1) // Skip header row
            .map((row, index) => {
                // First, map every row to an object with its correct row number
                const rowData: any = { rowNumber: index + 2 }; // +2 because of 1-based index and header
                header.forEach((key, i) => {
                    rowData[key] = row[i] || ''; // Use empty string for empty cells
                });
                return rowData as SheetRow;
            })
            .filter((row): row is SheetRow => row !== null); // Filter out any potential nulls from mapping, just in case

        // Now, filter the mapped data
        const filteredData = allData.filter(row => row.checkup === '0');


        return NextResponse.json({ data: filteredData });
    } catch (error: any) {
        console.error('Error fetching from Google Sheets:', error);
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
