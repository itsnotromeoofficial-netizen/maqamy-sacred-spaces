# Hidden MAQAMY Admin

## Build
- Make the MAQAMY wordmark on the introduction page open the admin sign-in only after three quick taps or clicks.
- Add a discreet admin login page using the supplied username and password, verified only on the server.
- Keep the admin signed in with a secure encrypted session and provide a sign-out control.
- Add a separate admin catalogue page to increase or reduce stock, edit price and specifications, add products, and delete products.
- Connect the public Collections page and cart availability to the live product catalogue so admin changes appear to customers.

## Security
- Keep the supplied admin password in encrypted project secrets, never in browser code or the database.
- Protect every product change on the server; knowing the admin page URL alone grants no access.
- Validate names, prices, stock counts, and specifications before saving.

## Verification
- Test that one or two taps do nothing, the third tap opens admin login, incorrect credentials fail, and correct credentials unlock management.
- Test add, edit, stock adjustment, and delete behavior, plus mobile and desktop layouts.
