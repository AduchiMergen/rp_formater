# Stellar Transaction Formatter

A simple web application to format Stellar transaction details with editable account names.

**Live URL**: [https://aduchimergen.github.io/rp_formater/](https://aduchimergen.github.io/rp_formater/)

## Features

- Format Stellar transaction details from stellar.expert URLs
- Edit and save account names locally
- Special formatting for transactions from specific addresses
- Copy formatted output with proper line breaks
- Persistent name storage using localStorage
- Auto-fetch account names from Stellar network

## Installation

1. Use the live version at [https://aduchimergen.github.io/rp_formater/](https://aduchimergen.github.io/rp_formater/)

Or install locally:

2. Clone this repository:
```bash
git clone <repository-url>
cd txFormater
```

3. No build process required - just open `index.html` in a browser

## Usage

1. Open `index.html` in your web browser
2. Paste a stellar.expert transaction URL into the input field
3. The transaction will be automatically formatted
4. Click on any address/name to edit it
5. Click "Copy to Clipboard" to copy the formatted text
6. Use "Clear Names Cache" to reset saved names

## Special Formatting

- Transactions from `GCNVDZIHGX473FEI7IXCUAEXUJ4BGCKEMHF36VYP5EMS7PX2QBLAMTLA` show full details with grouping
- Other transactions show simplified output
- Names are saved locally and persist between sessions

## Example Output

```
Mediation Team
Muckvik (Alexey) - 3.0000000 MUKSYCC
GBRM...FK3W - 4.0000000 dobr
hhhhhh - 8.0000000 DD24
| - 16.0000000 timeline

GACO...RICH
| - 1.0000000 timeline
GAZT...QVCQ - 1.0000000 Engagement
KAMNI - 5.0000000 STAS
GAQP...C26F - 10.0000000 ATV
```

## Technologies Used

- HTML5
- JavaScript (ES6+)
- Tailwind CSS
- Stellar SDK
- LocalStorage API
