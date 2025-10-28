# **App Name**: AliExpress HTML Generator

## Core Features:

- Input Form: Create a form with text fields for revenue parameters, AF value, AliExpress product URL, product price, discount codes, coupon codes, coin discount, and card discount.
- HTML Generation: Generate the HTML string combining the image URL fetched from the backend, final product URL, and price information.
- Backend Integration: Call the provided Cloud Run endpoint (https://alihelper-imageurl-53912196882.asia-northeast3.run.app) to fetch the image URL, passing the AliExpress product URL in the request body as JSON { "target_url": "..." }.
- Image URL Fetching: Fetches the image URL from the backend Cloud Run service based on the provided AliExpress product URL.
- Price Calculation: Calculate the final price by subtracting discount amounts (discount code, store coupon, coins, card) from the product price.
- HTML Display: Display the generated HTML in a read-only textarea on the right side of the page.
- Copy to Clipboard: Add a 'Copy HTML' button to copy the contents of the textarea to the clipboard.

## Style Guidelines:

- Primary color: A vibrant AliExpress orange (#FF4F00) to reflect the brand's identity.
- Background color: A light, desaturated orange (#FFF2EC) to provide a clean and neutral backdrop.
- Accent color: A complementary, slightly reddish orange (#FF4000) for interactive elements.
- Body and headline font: 'Inter', a sans-serif font known for its readability and modern aesthetic. 
- Two-column layout with the input form on the left and the generated HTML output on the right.
- Minimalist icons for the 'Copy HTML' button and loading spinner, in the same orange tone as the primary color.
- Use a loading spinner animation when the HTML is generating.