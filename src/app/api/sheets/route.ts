
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
const DATA_SHEET_NAME = 'data';
const SNS_UPLOAD_SHEET_NAME = 'sns_upload';


export async function GET() {
    try {
        const sheets = await getSheetsClient();
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: DATA_SHEET_NAME,
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
            .filter(item => item.checkup === '0' || !item.hasOwnProperty('checkup'))
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
        const { rowNumber, newValues, sheetName } = await request.json();

        if (!newValues) {
            return NextResponse.json({ error: 'Missing newValues' }, { status: 400 });
        }
        
        const sheets = await getSheetsClient();
        
        // Handle appending to sns_upload sheet
        if (sheetName === SNS_UPLOAD_SHEET_NAME) {
            const headerResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SNS_UPLOAD_SHEET_NAME}!1:1`,
            });
            
            const headers = headerResponse.data.values?.[0];
            if (!headers) {
                 return NextResponse.json({ error: `Could not read headers from ${SNS_UPLOAD_SHEET_NAME} sheet` }, { status: 500 });
            }

            const newRow = headers.map(header => newValues[header] || '');

            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SNS_UPLOAD_SHEET_NAME}!A:A`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [newRow],
                },
            });

            return NextResponse.json({ success: true, message: `Appended a new row to ${SNS_UPLOAD_SHEET_NAME}` });
        }

        // Default behavior: update the 'data' sheet
        const targetSheetName = DATA_SHEET_NAME;

        if (rowNumber) {
            // Logic to update a specific row in the 'data' sheet (e.g., for 'checkup')
            const headerResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${targetSheetName}!1:1`,
            });
            
            const headers = headerResponse.data.values?.[0];
            if (!headers) {
                 return NextResponse.json({ error: `Could not read headers from ${targetSheetName} sheet` }, { status: 500 });
            }

            const updates = [];
            for (const key in newValues) {
                const columnIndex = headers.indexOf(key);
                if (columnIndex !== -1) {
                    const columnLetter = String.fromCharCode('A'.charCodeAt(0) + columnIndex);
                    updates.push({
                        range: `${targetSheetName}!${columnLetter}${rowNumber}`,
                        values: [[newValues[key]]],
                    });
                }
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
             return NextResponse.json({ success: true, message: `Updated row ${rowNumber} in ${targetSheetName}` });
        } else {
             return NextResponse.json({ error: 'rowNumber is required to update the data sheet' }, { status: 400 });
        }


    } catch (error: any) {
        console.error('Error updating sheet data:', error);
        return NextResponse.json({ error: 'Failed to update sheet data', details: error.message || error }, { status: 500 });
    }
}
