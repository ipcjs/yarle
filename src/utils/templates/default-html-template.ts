export const defaultHtmlTemplate = `
    <!DOCTYPE html>
        <head>
        <title>__title__</title>
        <meta http-equiv="Content-Type" content="text/html;charset=utf-8" />

        <style>
        body {
        padding: 1em;
        color: #080808;
        background-color: #f8f8f8;
        }
        body, td, th {
        font-family: Arial,"Helvetica Neue",Helvetica,sans-serif;
        font-size: 12pt;
        }
        table.meta {
        margin-bottom: 3em;
        border-collapse: collapse;
        }
        table.meta th {
        text-align: left;
        }
        table.meta th, table.meta td {
        padding: 2pt 4pt;
        background-color: #D4DDE5;
        border: 1px solid #444444;
        font-size: 10pt;
        }
        </style>
        </head>
        <body>
        <h1>__title__</h1>
        <table class="meta">__metaTable__
        </table>
        __content__
        </body>
        </html>`;