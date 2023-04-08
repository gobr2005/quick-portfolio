## Excel to Google Sheets

**Project description:** I created a couple of Python programs to quickly upload an Excel to Google Sheet. I created one to change the csv to a dataframe. This Python program calls the second python program. The second program connects to Google Sheet through the [gspread](https://docs.gspread.org/en/v5.7.1/) Python package. Both programs are currently used for a single specific Google Sheet I update regularly. I am think of better ways to make them more usable for other projects. 

### Converting Excel to a Dataframe.

#### 1. Imported Pandas and update function

```
import pandas as pd
from gs_update import gs_update
```

#### 2. This part converts the Excel file to a dataframe. 
FILE_PATH needs to be replaced with the file path. The `cols_list` contains the needed columns. This will be used in the read_excel function to select the proper columns.

```
PATH = r"FILE_PATH"

cols_list = [] # List of columns needs from the Excel file, if you do not need them all

df = pd.read_excel(path, usecols=cols_list) # Remvoe usecols=cols_list if you want to read all columns
```

#### 3. Call the `gs_update` function to import the dataframe to Google Sheets
The final step for importing is the using the `gs_update` to access the Google Sheets API through gspread library. 

```
gs_update(df)
```

### Importing Dataframe into Google Sheets Program

