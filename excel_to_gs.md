## Excel to Google Sheets

**Project description:** I created a couple of Python programs to quickly upload an Excel to Google Sheet. I created one to change the csv to a dataframe. This Python program calls the second python program. The second program connects to Google Sheet through the [gspread](https://docs.gspread.org/en/v5.7.1/) Python package. Both programs are currently used for a single specific Google Sheet I update regularly. I am thinking of better ways to make them more usable for other projects. 

### Converting Excel to a Dataframe.

#### 1. Imported Pandas and update function

```python
import pandas as pd
from gs_update import gs_update
```

#### 2. This part converts the Excel file to a dataframe. 
FILE_PATH needs to be replaced with the file path. The `cols_list` contains the needed columns. This will be used in the read_excel function to select the proper columns.

```python
PATH = r"FILE_PATH"

cols_list = [] # List of columns needed from the Excel file, if you do not need them all

df = pd.read_excel(PATH, usecols=cols_list) # Remove usecols=cols_list if you want to read all columns
```

#### 3. Call the `gs_update` function to import the dataframe to Google Sheets
The final step for importing is using the `gs_update` function to access the Google Sheets API through the gspread library. 

```python
gs_update(df)
```

### Importing Dataframe into Google Sheets Program

The `gs_update` function handles the Google Sheets connection and upload. It authenticates using a service account credentials file, opens the target sheet, clears the existing data, and replaces it with the dataframe.

#### 1. Import libraries

```python
import gspread
from oauth2client.service_account import ServiceAccountCredentials
```

#### 2. Set up credentials and connect to Google Sheets

A service account JSON credentials file is required to authenticate with the Google Sheets API. The `scope` defines the permissions needed.

```python
def gs_update(df):
    credentials_file = r"PATH_TO_CREDENTIALS.json"

    scope = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]

    credentials = ServiceAccountCredentials.from_json_keyfile_name(credentials_file, scope)
    client = gspread.authorize(credentials)
```

#### 3. Open the worksheet and update it with the dataframe

The sheet is opened by name and the target worksheet is selected. The existing data is cleared before writing the new dataframe — headers first, then rows.

```python
    sheet = client.open("SHEET_NAME")
    worksheet = sheet.worksheet("WORKSHEET_NAME")

    worksheet.clear()

    df = df.fillna('')
    columns_head = df.columns.values.tolist()
    columns_values = df.values.tolist()

    worksheet.update([columns_head] + columns_values)
    print("Sheet Updated")
```
