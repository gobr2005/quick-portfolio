## Excel to Google Sheets

**Project description:** I created a couple of Python programs to quickly upload an Excel file to Google Sheets. I made one to change the CSV to a data frame. This Python program calls the second Python program. The second program connects to Google Sheets through the [gspread](https://docs.gspread.org/en/v5.7.1/) Python package. Both programs are currently used for a specific Google Sheet I regularly update. I am thinking of better ways to make them more usable for other projects. 

### Converting Excel to a Dataframe.

#### 1. Imported Pandas and the update function

```
import pandas as pd
from gs_update import gs_update
```

#### 2. This part converts the Excel file to a DataFrame. 
FILE_PATH needs to be replaced with the file path. The `cols_list` contains the needed columns. This will be used in the read_excel function to select the proper columns.

```
PATH = r"FILE_PATH"

cols_list = [] # List of columns needed from the Excel file, if you do not need them all

df = pd.read_excel(path, usecols=cols_list) # Remvoe usecols=cols_list if you want to read all columns
```

#### 3. Call the `gs_update` function to import the DataFrame to Google Sheets
The final step for importing is using the `gs_update` to access the Google Sheets API through gspread library. Before calling gs_update, add the sheet name or id from URL as a variable. By not adding the sheet to `gs_update`, it can be used with different.
```
sheet_name = "Google Sheet Title or ID"
gs_update(df, sheet_name)
```

### Importing Dataframe into Google Sheets Program
This program takes the DataFrame from the first program and sends it to the sheet named.  One edit I would like to add is the ability to send whether it should clear the sheet or append data to the sheet. 


#### 1. Add the proper Google access APIs
