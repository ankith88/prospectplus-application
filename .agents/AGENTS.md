# Project-scoped Rules

## Outbound Email Templates Design & Formatting Rules

When creating or updating HTML email templates, you must follow these rules to ensure styling compatibility and pixel-perfect rendering across all major email providers (Gmail, Outlook, Yahoo, Hotmail, etc.):

1. **Table-Based Layout Structure:**
   * Do not use block divs or flexbox/grid for the main layout.
   * Wrap the entire document in an outer container `<table>` with `width="100%"` and `style="background-color: #f4f7f8; padding: 20px 0;"`.
   * Keep the inner box as a `<table>` with `align="center"`, `width="600"`, and `style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;"`.

2. **Inline CSS Styles:**
   * All formatting rules (fonts, margins, text sizing, padding, background colors, borders, and border-radius) must be written directly as `style="..."` attributes on the HTML elements (like `<td>`, `p`, `span`, `a`, `h2`, `table`).
   * Media queries are allowed inside a `<style>` block in `<head>` only for responsive mobile scaling overrides.

3. **Lists and Bullets:**
   * Avoid standard `<ul>`/`<li>` elements if using custom emojis or bullet layouts.
   * Format lists using structured `<table>` grids where the bullet/emoji resides in the first `<td>` (with fixed width, e.g. `width="32"`) and the description in the second `<td>`. This guarantees they render correctly in Outlook.

4. **Brand Banner and Footer:**
   * Place the brand logo inside a navy blue banner `<td>` row:
     ```html
     <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
       <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
     </td>
     ```
   * Place the standardized brand and legal footer inside a footer `<td>` row:
     ```html
     <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
       <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
         <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
       </p>
       <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
         Powered by MailPlus Australia
       </p>
       <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
         &copy; 2026 MailPlus. All rights reserved. <br />
         If you no longer wish to receive marketing communications, you can&nbsp;
         <a href="{{unsubscribe_link}}" style="color: #095c7b; text-decoration: underline;">Unsubscribe here</a>
       </p>
     </td>
     ```
