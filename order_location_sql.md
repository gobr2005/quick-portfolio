# Order Location SQL 

[View code](https://github.com/gobr2005/BigCommerceCode/tree/main/order_location)

## Purpose

The purpose of the Order Location SQL query is to find where packages are being shipped. 

## Details

This query first cleans the data through a temporary table. It takes the shipping address from BigCommerce's `bc_order_shipping_addresses` table and joins it to a table containing state and state postcodes. This table was uploaded to BigQuery from a CSV file. This join uses a `case` function to check the length of the state code and determines if the ID is on the state postcode or the name. The result returns the state name so everything is uniform. We needed this because some of our API checkouts used state postcode instead of the name. I also used a left to only pull the 5-digit zipcode. 

The main query takes the temporary table and joins it with the `bc_order` table. This query adds order_created_date_time. It also is needed for the `WHERE` statement which reduces the record to only orders with an exchange of money. This means orders which were fully refunded/returned were removed from the query. 

## Using the Query

I designed this query to be a simple copy-and-paste to add your account information. 

1. Upload a CSV from the state's name and state postcodes.
2. Copy and paste the [order_location](https://github.com/gobr2005/BigCommerceCode/blob/20a002e18a170dcbc304acc4f55cca4aed02489c/order_location/order_location.sql) code into BigQuery editor.
3. You will need to update the table ids. By default, I set them as `project_name.store_name.bc_order_shipping_addresses` and kept the original table names that BigCommerce sends over. You can find the table ids in the table details. 
4. Save the query as a view so you can reuse it for different projects or add different information for further analysis. 
