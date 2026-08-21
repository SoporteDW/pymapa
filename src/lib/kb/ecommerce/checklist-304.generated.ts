/**
 * B6 · Instrumento experto: checklist metodológico CRO/UX de e-commerce.
 *
 * ARCHIVO GENERADO a partir del activo autorizado `E-commerce_Checklist.xlsx`
 * (304 verificaciones, 8 grupos). No editar a mano y no reescribir su
 * contenido: es conocimiento importado, versionado y parametrizable.
 * La interfaz NUNCA duplica estos textos; los consume desde aquí.
 */

import type { ChecklistExperto } from "./checklist";

export const CHECKLIST_CRO_VERSION = "cro-ux-checklist-1.0.0";

export const checklistCroUx: ChecklistExperto = {
  "id": "INS-EC-CHECKLIST-304",
  "nombre": "Checklist metodológico CRO/UX de e-commerce",
  "version": "cro-ux-checklist-1.0.0",
  "fuente": "E-commerce_Checklist.xlsx (activo autorizado de la Base de Conocimiento)",
  "totalVerificaciones": 304,
  "grupos": [
    {
      "id": "general",
      "nombre": "General",
      "hoja": "⚙️ General",
      "verificaciones": [
        {
          "id": "CRO-GEN-001",
          "grupo": "general",
          "subgrupo": "General",
          "texto": "Main pages (home page, landing page, product page) load quickly (5 seconds or less)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-GEN-002",
          "grupo": "general",
          "subgrupo": "General",
          "texto": "Every page has a CTA (even 404 error pages, result page with 0 results, blog posts, about us page)",
          "impacto": 1,
          "costo": 1
        },
        {
          "id": "CRO-GEN-003",
          "grupo": "general",
          "subgrupo": "General",
          "texto": "Things that are clickable (like buttons) are obviously pressable (hover states, rounded corners, subtle gradient, blue underlined links)",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-GEN-004",
          "grupo": "general",
          "subgrupo": "General",
          "texto": "Cookie notification bar can be easily closed or approved (under 2 seconds)",
          "impacto": 1,
          "costo": 1
        },
        {
          "id": "CRO-GEN-005",
          "grupo": "general",
          "subgrupo": "General",
          "texto": "The site offers wishlists which is the easiest first step in the checkout process",
          "impacto": 2,
          "costo": 3
        },
        {
          "id": "CRO-GEN-006",
          "grupo": "general",
          "subgrupo": "General",
          "texto": "Button labels and link labels start with a verb and time (e.g. \"Shop Now\")",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-GEN-007",
          "grupo": "general",
          "subgrupo": "General",
          "texto": "Items that aren't clickable do not have characteristics that suggest that they are",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-GEN-008",
          "grupo": "general",
          "subgrupo": "General",
          "texto": "There is sufficient space between action targets (buttons, forms) to prevent the user from hitting multiple or incorrect targets",
          "impacto": 1,
          "costo": 1
        },
        {
          "id": "CRO-GEN-009",
          "grupo": "general",
          "subgrupo": "General",
          "texto": "The store offers upsell opportunities between the checkout page and thank you page; if the user decides to add another product to the order, he doesn't need to input all the payment info again",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-GEN-010",
          "grupo": "general",
          "subgrupo": "General",
          "texto": "The shop's logo is placed in the same location on every page; clicking the logo returns the user to the most logical page (e.g. home page)",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-GEN-011",
          "grupo": "general",
          "subgrupo": "General",
          "texto": "The website uses subtle micro-animations (e.g. pulses) to emphasise the main CTA on every page",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-GEN-012",
          "grupo": "general",
          "subgrupo": "General",
          "texto": "The site doesn't include annoying pop-ups at the wrong time (too early in the process)",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-GEN-013",
          "grupo": "general",
          "subgrupo": "General",
          "texto": "The home page promotes site-wide offers at the top of the page (e.g. Free Shipping) with urgency and scarcity triggers (\"Only today\") and a linked CTA (\"Shop best-sellers now\")",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-GEN-014",
          "grupo": "general",
          "subgrupo": "General",
          "texto": "The top bar with a site-wide offer is prominent, with a clear CTA",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-GEN-015",
          "grupo": "general",
          "subgrupo": "Navigation",
          "texto": "The navigation system is broad and shallow (many items per menu level) rather than deep (many menu levels)",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-GEN-016",
          "grupo": "general",
          "subgrupo": "Navigation",
          "texto": "Good navigational feedback is provided (e.g. showing active state of where you are on the site)",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-GEN-017",
          "grupo": "general",
          "subgrupo": "Navigation",
          "texto": "Category labels accurately describe the information in the category",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-GEN-018",
          "grupo": "general",
          "subgrupo": "Navigation",
          "texto": "Navigation items are ordered in the most logical or task-oriented manner (with the less important corporate information at the bottom)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-GEN-019",
          "grupo": "general",
          "subgrupo": "Navigation",
          "texto": "Main navigation doesn't include unnecessary links (e.g. privacy policy, return policy, and terms and conditions)",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-GEN-020",
          "grupo": "general",
          "subgrupo": "Navigation",
          "texto": "Store uses sticky navigation, so the categories, first page, search and cart widget are easily accessible all the time",
          "impacto": 2,
          "costo": 3
        },
        {
          "id": "CRO-GEN-021",
          "grupo": "general",
          "subgrupo": "Search bar",
          "texto": "The home page contains a prominent search box near the top (or top-right) of the website",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-GEN-022",
          "grupo": "general",
          "subgrupo": "Search bar",
          "texto": "The search bar has an auto-complete and auto-suggest option",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-GEN-023",
          "grupo": "general",
          "subgrupo": "Search bar",
          "texto": "Auto-suggest searches through categories and products",
          "impacto": 2,
          "costo": 3
        },
        {
          "id": "CRO-GEN-024",
          "grupo": "general",
          "subgrupo": "Search bar",
          "texto": "The search results page shows the user what was searched for; it is easy to edit and resubmit the search",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-GEN-025",
          "grupo": "general",
          "subgrupo": "Search bar",
          "texto": "Search results are clear, useful, and ranked by relevance and how many results were retrieved",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-GEN-026",
          "grupo": "general",
          "subgrupo": "Search bar",
          "texto": "If no results are returned, the search engine gracefully (\"oh, snap\") offers ideas or options for improving the query based on identifiable problems with the user's input",
          "impacto": 1,
          "costo": 2
        },
        {
          "id": "CRO-GEN-027",
          "grupo": "general",
          "subgrupo": "Search bar",
          "texto": "The most common queries (as reflected in analytics) produce useful results",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-GEN-028",
          "grupo": "general",
          "subgrupo": "Search bar",
          "texto": "The search engine includes templates, examples or hints on how it can be used effectively: verb + item (e.g. search \"men's hat, blue leggings, XL pullovers\")",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-GEN-029",
          "grupo": "general",
          "subgrupo": "Search bar",
          "texto": "The search box is long enough to handle common query lengths",
          "impacto": 1,
          "costo": 1
        },
        {
          "id": "CRO-GEN-030",
          "grupo": "general",
          "subgrupo": "Search bar",
          "texto": "The search box gives results if you press Enter",
          "impacto": 1,
          "costo": 1
        },
        {
          "id": "CRO-GEN-031",
          "grupo": "general",
          "subgrupo": "Search bar",
          "texto": "The search box contains a \"magnifying glass\" icon that clearly represents the search function",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-GEN-032",
          "grupo": "general",
          "subgrupo": "Search bar",
          "texto": "Once you click on the search field and before you type in anything, the search gives you hints of your recent searches or trending searches",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-GEN-033",
          "grupo": "general",
          "subgrupo": "Search bar",
          "texto": "The search engine provides automatic spell checking and searches for plurals and synonyms",
          "impacto": 2,
          "costo": 3
        },
        {
          "id": "CRO-GEN-034",
          "grupo": "general",
          "subgrupo": "Cart widget in the header",
          "texto": "Cart widget is easibly accesible on every page in the top-right corner",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-GEN-035",
          "grupo": "general",
          "subgrupo": "Cart widget in the header",
          "texto": "Mini cart widget includes the total price, total discount, number of items, all items in the cart (on hover) and it's prominent on every page",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-GEN-036",
          "grupo": "general",
          "subgrupo": "Cart widget in the header",
          "texto": "If the store has a free shipping option, the cart widget clearly states how far away the user is from getting free shipping",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-GEN-037",
          "grupo": "general",
          "subgrupo": "Cart widget in the header",
          "texto": "A link to both the basket and checkout is clearly visible on the mini-cart widget",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-GEN-038",
          "grupo": "general",
          "subgrupo": "Cart widget in the header",
          "texto": "Empty cart widget has (on hover) CTA to \"Shop our best-sellers\"",
          "impacto": 1,
          "costo": 2
        },
        {
          "id": "CRO-GEN-039",
          "grupo": "general",
          "subgrupo": "Footer",
          "texto": "Footer highlights benefits of shopping at the store (e.g. free shipping, returns, money back, 19k products shipped this month, contact information)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-GEN-040",
          "grupo": "general",
          "subgrupo": "Footer",
          "texto": "Footer contains a \"Back to top\" link so the user can easily go back to the top",
          "impacto": 1,
          "costo": 1
        },
        {
          "id": "CRO-GEN-041",
          "grupo": "general",
          "subgrupo": "Footer",
          "texto": "It is clear that there is a real organisation behind the site (e.g. there is a physical address or a photo of the office)",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-GEN-042",
          "grupo": "general",
          "subgrupo": "Footer",
          "texto": "It is easy to see the return policy, privacy policy and terms & conditions on any given page with one click",
          "impacto": 1,
          "costo": 1
        },
        {
          "id": "CRO-GEN-043",
          "grupo": "general",
          "subgrupo": "Footer",
          "texto": "Footer shows trust icons / seal badges (e.g. verified by Norton) along with reassuring copy (e.g. \"Shop with confidence\")",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-GEN-044",
          "grupo": "general",
          "subgrupo": "Footer",
          "texto": "Footer includes links to social networks and a total number of likes/followers (so that the user can check them for trust)",
          "impacto": 1,
          "costo": 1
        },
        {
          "id": "CRO-GEN-045",
          "grupo": "general",
          "subgrupo": "Footer",
          "texto": "Footer includes links to main categories",
          "impacto": 2,
          "costo": 1
        }
      ]
    },
    {
      "id": "home",
      "nombre": "Home",
      "hoja": "🏠 Home page",
      "verificaciones": [
        {
          "id": "CRO-HOM-001",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "The home page promotes site-wide offers on top of the page (e.g. Free Shipping) with urgency and scarcity triggers",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-HOM-002",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "The home page is professionally designed, not overloaded, and it creates a positive first impression",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-HOM-003",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "Once you land on the homepage, you know the main products that the store is selling",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-HOM-004",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "The home page follows a clear, straightfowrard visual hierarchy",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-HOM-005",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "The value proposition is clearly stated on the home page (e.g. with a tagline or welcome blurb)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-HOM-006",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "The home page contains meaningful high-quality graphics, not clip art or pictures of models",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-HOM-007",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "The home page contains one or two (e.g. Shop for men, Shop for women) visually prominent CTAs above the fold and it has relevant copy (e.g. Start shopping)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-HOM-008",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "The home page highlights any specific deals, special offers or urgency offers near the top",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-HOM-009",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "The home page highlights the main benefits of shopping with you (e.g. \"Vegan friendly\", \"We give back to charity\", \"Not tested on animals\", \"19,222 products successfully shipped and delivered this month alone\")",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-HOM-010",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "The most important product categories are shown first, with descriptive photos near the top of the homepage",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-HOM-011",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "The store uses special category pages (best-sellers, new, sale, \"30% off\", etc.) that take users into a shopping mode",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-HOM-012",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "There is a short list of the most important products supplemented with links on the home page",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-HOM-013",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "The home page contains an option for customers to contact the store (e.g. live chat, email, or phone number)",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-HOM-014",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "The home page shows recently viewed items for returning visitors",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-HOM-015",
          "grupo": "home",
          "subgrupo": "General",
          "texto": "The story of the founders behind the product and store is shown, along with their mission and vision",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-HOM-016",
          "grupo": "home",
          "subgrupo": "Social proof",
          "texto": "The home page contains general customer reviews or product specifics with a link to the product itself",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-HOM-017",
          "grupo": "home",
          "subgrupo": "Social proof",
          "texto": "The home page shows overall store ratings from authoritative review sites (e.g. Trustpilot, Reviews.com, Yotpo, Podium)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-HOM-018",
          "grupo": "home",
          "subgrupo": "Social proof",
          "texto": "The home page contains awards, trust-badges, and certificates earned by the store",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-HOM-019",
          "grupo": "home",
          "subgrupo": "Social proof",
          "texto": "The home page highlights logos of news sites/blogs/celebrities where the product/brand has had any PR exposure (e.g. \"Used by executives at Fortune 500\")",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-HOM-020",
          "grupo": "home",
          "subgrupo": "Social proof",
          "texto": "The home page highlights logos of well-known brands",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-HOM-021",
          "grupo": "home",
          "subgrupo": "Social proof",
          "texto": "The home page contains user-generated photos (e.g. from Instagram)",
          "impacto": 3,
          "costo": 2
        }
      ]
    },
    {
      "id": "categoria",
      "nombre": "Categoría",
      "hoja": "📂 Category page",
      "verificaciones": [
        {
          "id": "CRO-CAT-001",
          "grupo": "categoria",
          "subgrupo": "General",
          "texto": "Users can sort category page (e.g. ordering by price, \"best-sellers\", \"new items\", \"most popular\", or \"most discounted\")",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAT-002",
          "grupo": "categoria",
          "subgrupo": "General",
          "texto": "The sorting feature is shown in the top-right corner above the product list/grid",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-CAT-003",
          "grupo": "categoria",
          "subgrupo": "General",
          "texto": "Category page has clear and understandable (sub)category names",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-CAT-004",
          "grupo": "categoria",
          "subgrupo": "General",
          "texto": "Category page uses relevant category page design (grid view when images are the main decision factor and list view when product attributes are the main decision factor)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAT-005",
          "grupo": "categoria",
          "subgrupo": "General",
          "texto": "Shows exact number of products available on each page (either if the page is filtered or not)",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-CAT-006",
          "grupo": "categoria",
          "subgrupo": "General",
          "texto": "A page description section (cca. 400 words) is on top (visually 90% hidden with \"Read more\") or on the bottom for SEO purposes",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CAT-007",
          "grupo": "categoria",
          "subgrupo": "General",
          "texto": "You stay at the same vertical position if you go to product page and then back to category page",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAT-008",
          "grupo": "categoria",
          "subgrupo": "Product cards (list)",
          "texto": "Relevant (3-4) products are shown per row",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CAT-009",
          "grupo": "categoria",
          "subgrupo": "Product cards (list)",
          "texto": "Trending, top-rated and best-selling items are shown on top of each category by default",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAT-010",
          "grupo": "categoria",
          "subgrupo": "Product cards (list)",
          "texto": "Additional product photos are shown on mouse hover",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-CAT-011",
          "grupo": "categoria",
          "subgrupo": "Product cards (list)",
          "texto": "Consistent style of images is used for better scannability (type of images, image background, white space around the products, size of product, angle of photos)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CAT-012",
          "grupo": "categoria",
          "subgrupo": "Product cards (list)",
          "texto": "Consistent size of product cards is used for better scannability",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAT-013",
          "grupo": "categoria",
          "subgrupo": "Product cards (list)",
          "texto": "The category page clearly shows which product variants (size, color) are available for each specific product",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAT-014",
          "grupo": "categoria",
          "subgrupo": "Product cards (list)",
          "texto": "All important information is shown for each product (prominent product title, old price, new price, discount, review count, overall star rating, short description, product variants [size, color], short descriptions, product attributes)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAT-015",
          "grupo": "categoria",
          "subgrupo": "Product cards (list)",
          "texto": "CTA button is shown to motivate users to go look at the product page (ideally on :hover)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAT-016",
          "grupo": "categoria",
          "subgrupo": "Product cards (list)",
          "texto": "Scarcity on products that are limited in stock is shown (\"Only 1 left\")",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAT-017",
          "grupo": "categoria",
          "subgrupo": "Product cards (list)",
          "texto": "Items out of stock are shown (\"You just missed it\") so the scarcity above is more convincing",
          "impacto": 2,
          "costo": 3
        },
        {
          "id": "CRO-CAT-018",
          "grupo": "categoria",
          "subgrupo": "Product cards (list)",
          "texto": "Badges on product image thumbnails are shown (e.g. \"Fast delivery\",\"Best-seller\", \"New\", \"Top choice\", \"Trending\")",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAT-019",
          "grupo": "categoria",
          "subgrupo": "Product cards (list)",
          "texto": "A customer can give their email address if the product is currently not available; they will be notified when it becomes available",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAT-020",
          "grupo": "categoria",
          "subgrupo": "Filters",
          "texto": "Category page offers easy to understand and useful (especially on mobile) filters (applicable only for stores with a large number of products)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CAT-021",
          "grupo": "categoria",
          "subgrupo": "Filters",
          "texto": "The filters are prominent enough (relevant only for stores where users are prone to use filters)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAT-022",
          "grupo": "categoria",
          "subgrupo": "Filters",
          "texto": "The most popular filters are shown at the top of the filters",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-CAT-023",
          "grupo": "categoria",
          "subgrupo": "Filters",
          "texto": "Only relevant filters are shown for each category (e.g. screen size for \"Monitors\" category)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAT-024",
          "grupo": "categoria",
          "subgrupo": "Filters",
          "texto": "It is clearly visible (especially on mobile) that filters are applied, how many there are and can be easily removed",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CAT-025",
          "grupo": "categoria",
          "subgrupo": "Filters",
          "texto": "Users can select multiple filters at once",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CAT-026",
          "grupo": "categoria",
          "subgrupo": "Filters",
          "texto": "Filters are shown in a standard position on the left or on top (below the category name)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAT-027",
          "grupo": "categoria",
          "subgrupo": "Filters",
          "texto": "When a filter is selected, the category page auto-updates in real-time (ajax)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CAT-028",
          "grupo": "categoria",
          "subgrupo": "Filters",
          "texto": "Product filters are sticky and can be easily accessed at any given moment",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-CAT-029",
          "grupo": "categoria",
          "subgrupo": "Filters",
          "texto": "Relevant selectors are used for different types of filters (e.g. color swatches instead of \"blue\", price range slider where users can type in the minimum and maximum price insted of a pre-made list of price ranges)",
          "impacto": 3,
          "costo": 3
        }
      ]
    },
    {
      "id": "producto",
      "nombre": "Producto",
      "hoja": "💄 Product page",
      "verificaciones": [
        {
          "id": "CRO-PRO-001",
          "grupo": "producto",
          "subgrupo": "General",
          "texto": "Sticky navigation with product name, product image, product page sections, availability, old price, new price, discount and CTA that hides when the user is scrolling down but reappears when the user scrolls up",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-002",
          "grupo": "producto",
          "subgrupo": "General",
          "texto": "Product page has an option for potential customers to ask questions (e.g. live chat, phone number)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-003",
          "grupo": "producto",
          "subgrupo": "General",
          "texto": "Product page contains breadcrumbs (not applicable to single product stores and direct-response landing pages)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-004",
          "grupo": "producto",
          "subgrupo": "General",
          "texto": "A customer can give their email address if the product is currently not available; they will be notified when it becomes available",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-005",
          "grupo": "producto",
          "subgrupo": "General",
          "texto": "Clicking the back button always takes the user back to the page the user came from",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-006",
          "grupo": "producto",
          "subgrupo": "Product overview (above the CTA area)",
          "texto": "Product titles are descriptive",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-007",
          "grupo": "producto",
          "subgrupo": "Product overview (above the CTA area)",
          "texto": "The main product title is visually prominent compared to other content",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-008",
          "grupo": "producto",
          "subgrupo": "Product overview (above the CTA area)",
          "texto": "The product title is under 65 characters so it appears fully in Google search results",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-PRO-009",
          "grupo": "producto",
          "subgrupo": "Product overview (above the CTA area)",
          "texto": "The product subtitle highlight key product benefit and contain power words, e.g. effortless, incredible, absolute, unique, secret, now, new, exclusive, how to, why",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-010",
          "grupo": "producto",
          "subgrupo": "Product overview (above the CTA area)",
          "texto": "Product rating overviews are shown near product titles that are linked (with click & scroll) to product reviews (e.g. 4.6, Read 5 Reviews)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-011",
          "grupo": "producto",
          "subgrupo": "Product overview (above the CTA area)",
          "texto": "A short list of other key benefits of the product is near the main title and linked to a detailed description (with green check arrows)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-012",
          "grupo": "producto",
          "subgrupo": "Image gallery",
          "texto": "The main product photo is attractive",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-013",
          "grupo": "producto",
          "subgrupo": "Image gallery",
          "texto": "The main product photo allows a user to zoom in easily (especially on mobile)",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-PRO-014",
          "grupo": "producto",
          "subgrupo": "Image gallery",
          "texto": "There is a gallery with different product photos",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-015",
          "grupo": "producto",
          "subgrupo": "Image gallery",
          "texto": "The product gallery shows thumbnails of other available images",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-016",
          "grupo": "producto",
          "subgrupo": "Image gallery",
          "texto": "The product gallery contains product videos",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-017",
          "grupo": "producto",
          "subgrupo": "Image gallery",
          "texto": "The product gallery contains arrows to navigate between images",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-018",
          "grupo": "producto",
          "subgrupo": "Image gallery",
          "texto": "The product gallery supports swipe actions on mobile devices",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-019",
          "grupo": "producto",
          "subgrupo": "Image gallery",
          "texto": "There are images for different product variants/sizes",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-020",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "The main CTA is the most visible element on the product page and contains the \"cart\" icon",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-021",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "Product variants are easily accessible on mobile and big enough with enough white space around to prevent misclicks",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-022",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "The product variant selection is connected with the product gallery and shows images of chosen product variants",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-023",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "A visible reminder is included to select size/color if a customer forgets and clicks \"add to cart\" too early",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-024",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "Interactive selectors are used for product variants (the gallery image and the price are changed in real-time, without triggering a page reload)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-025",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "A size chart (or link that opens in a small popup and is easily closed on mobile) is provided near the size selections (for products with different sizes)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-026",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "Localized units for products are shown with different sizes/measurements (e.g. cm, inches, kg)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-027",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "Product descriptions mention the size of the model and the size of the shirt the model is wearing (only for apparel)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-028",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "Interactive selectors are used for quantity selection instead of dropdowns (the price and quantity are changed in real-time, without triggering a page reload)",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-PRO-029",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "The CTA copy clearly explains what will happen when you click on it (e.g. Proceed to secure checkout)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-030",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "Clear feedback is provided once the product has been added to the cart (e.g. a number in the mini-cart widget increases)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-031",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "The main CTA change states once users add a product to the cart (e.g. \"[check arrow] Product added to your cart\" and after 2 seconds \"Go to my shopping cart [right arrow]\")",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-032",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "The price of the product is prominent enough, especially if it's discounted",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-033",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "The price of the product is placed near the main CTA",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-034",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "The price of the product is localized",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-035",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "The background color of the product's primary CTA differs from other elements (e.g. slightly grey)",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-PRO-036",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "All additional charges that may apply are shown near the main CTA (e.g. additional shipping costs due to product size, VAT)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-037",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "If free shipping is offered, it's highlighted near the main CTA",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-038",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "All shipping information is shown near the main CTA (delivery to shopper's location, shopper's country flag, cost, time)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-039",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "Availability of the product is shown near the main CTA (e.g. \"In stock\")",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-040",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "The old price (with a strike-trough) is shown with the new price and how much shoppers will save (% or $) when the product is on sale",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-041",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "Clear information is shown about returns, refunds and money-back guarantee",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-042",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "Express payment options are shown and available that are commonly used (e.g. PayPal, Amazon, Google Pay, Apple Pay). Useful for direct-response landing pages",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-043",
          "grupo": "producto",
          "subgrupo": "CTA area",
          "texto": "There is an option for a payment with installments (e.g. Klarna, AfterPay; for expensive products only). Useful for direct-response landing pages that don't encourage the user to add other products to the cart",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-044",
          "grupo": "producto",
          "subgrupo": "Social proof",
          "texto": "Product page highlights logos of news sites/blogs/celebrities where the product/brand has had PR exposure (e.g. \"Used by executives at Fortune 500\" )",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-PRO-045",
          "grupo": "producto",
          "subgrupo": "Social proof",
          "texto": "Customer reviews are shown with a review title, customer photos of product, star rating, photo of reviewer, name and last name, \"verified\" buyer, occupation, and age",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-046",
          "grupo": "producto",
          "subgrupo": "Social proof",
          "texto": "Customer reviews visually stand out from other content (ideally on a slightly yellow background)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-047",
          "grupo": "producto",
          "subgrupo": "Social proof",
          "texto": "Product page contains photos (with faces) of how (happy) customers are using the product",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-048",
          "grupo": "producto",
          "subgrupo": "Social proof",
          "texto": "Product overall star ratings are shown and can be filtered by the star rating",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-049",
          "grupo": "producto",
          "subgrupo": "Social proof",
          "texto": "Product page contains the number of customers this week/month/all-time (e.g. \"19,222 products successfully shipped and delivered this month alone\")",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-PRO-050",
          "grupo": "producto",
          "subgrupo": "Social proof",
          "texto": "Product page contains video testimonials",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-051",
          "grupo": "producto",
          "subgrupo": "Social proof",
          "texto": "Product page contains the number of Facebook and Twitter followers",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-PRO-052",
          "grupo": "producto",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Clear quantity discounts are offered near the main CTA (1x $24.99/piece, [\"Top choice\" badge]; 2x 19,99€/piece, [\"Recommended\" badge]; 3x $17,49/piece, [\"Best value\" badge])",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-053",
          "grupo": "producto",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Relevant cross-sell/up-sell products are offered",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-054",
          "grupo": "producto",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Relevant bundle products are offered with prominent discounts",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-055",
          "grupo": "producto",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Urgency triggers are used (e.g. \"Today only\", \"Black Friday offer\", \"Free bonus\", \"If order is placed in the next 12 min, it will be shipped today\") near the main CTA",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-056",
          "grupo": "producto",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Scarcity triggers are used (e.g. \"Only 3 products left\") near the main CTA",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-057",
          "grupo": "producto",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Customers are shown how many people have viewed and bought the product in the last 24 hours",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-058",
          "grupo": "producto",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "A store is giving away a small percentage of the profit to charity; and highlights this information",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-059",
          "grupo": "producto",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "The product page contains \"Visitors who viewed this product also viewed...\" where users are shown complementary OR/AND alternative products",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-060",
          "grupo": "producto",
          "subgrupo": "Product description",
          "texto": "The product description is easy to read (font size, contrast, single column, 75 characters per line, line-height 1.5, max. 4 lines long)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-061",
          "grupo": "producto",
          "subgrupo": "Product description",
          "texto": "Product information structure is easy to scan (grouped information, bullet points, important benefits highlighted)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-062",
          "grupo": "producto",
          "subgrupo": "Product description",
          "texto": "The sections of the page (\"General\", \"Technical info\") are grouped together in accordion (if they are longer) and scannable on mobile",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-063",
          "grupo": "producto",
          "subgrupo": "Product description",
          "texto": "Section titles explain benefits (and not features) of the product",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-064",
          "grupo": "producto",
          "subgrupo": "Product description",
          "texto": "Customers are shown all the things that are included in the product (ideally with an included photo)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-065",
          "grupo": "producto",
          "subgrupo": "Product description",
          "texto": "Product page contains customer FAQs (for each specific product as well as store-wide questions)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-066",
          "grupo": "producto",
          "subgrupo": "Product description",
          "texto": "The table of technical specifications is readable (different colors of lines, hover state of the line, not too far apart)",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-PRO-067",
          "grupo": "producto",
          "subgrupo": "Product description",
          "texto": "Product page offers product comparisons",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-PRO-068",
          "grupo": "producto",
          "subgrupo": "Product description",
          "texto": "Product description explains how to use the product in 3 easy steps",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-PRO-069",
          "grupo": "producto",
          "subgrupo": "Product description",
          "texto": "Product page contains embedded reviews (or screenshots) from social networks (e.g. Facebook post, Messenger, Whatsapp, Tweet, Instagram post, Instagram PM, Viber, text message)",
          "impacto": 3,
          "costo": 3
        }
      ]
    },
    {
      "id": "landing",
      "nombre": "Landing",
      "hoja": "🛬 Landing page",
      "verificaciones": [
        {
          "id": "CRO-LAN-001",
          "grupo": "landing",
          "subgrupo": "General",
          "texto": "The buy button takes the user directly to the checkout (or upsell) and skips the cart page",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-002",
          "grupo": "landing",
          "subgrupo": "General",
          "texto": "Sticky navigation with product name, product image, product page sections, availability, old price, new price, discount and CTA that hides when the user is scrolling down but reappears when the user scrolls up",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-003",
          "grupo": "landing",
          "subgrupo": "General",
          "texto": "Landing page doesn't contain any outgoing links (e.g. clickable logo, navigation and footer)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-004",
          "grupo": "landing",
          "subgrupo": "General",
          "texto": "Product page has an option for the potential customer to ask questions (e.g. live chat, phone number)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-005",
          "grupo": "landing",
          "subgrupo": "Product overview (above the CTA area)",
          "texto": "Product titles are descriptive",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-006",
          "grupo": "landing",
          "subgrupo": "Product overview (above the CTA area)",
          "texto": "The main product title is visually prominent compared to other content",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-007",
          "grupo": "landing",
          "subgrupo": "Product overview (above the CTA area)",
          "texto": "The product title is under 65 characters so it appears fully in Google search results",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-LAN-008",
          "grupo": "landing",
          "subgrupo": "Product overview (above the CTA area)",
          "texto": "The product subtitles highlight key product benefits and contains power words, e.g. effortless, incredible, absolute, unique, secret, now, new, exclusive, how to, why",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-009",
          "grupo": "landing",
          "subgrupo": "Product overview (above the CTA area)",
          "texto": "Product rating overviews are shown near product titles that are linked (with scroll animation) to product reviews (e.g. 4.6, Read 5 Reviews)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-010",
          "grupo": "landing",
          "subgrupo": "Product overview (above the CTA area)",
          "texto": "A short list of key benefits of the product is near the main title and linked to a detailed description (with green check arrows)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-011",
          "grupo": "landing",
          "subgrupo": "Image gallery",
          "texto": "The page layout is standardized (e.g. photo gallery on the left side, description and CTA on the right)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-012",
          "grupo": "landing",
          "subgrupo": "Image gallery",
          "texto": "The main product photo is attractive",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-013",
          "grupo": "landing",
          "subgrupo": "Image gallery",
          "texto": "The main product photo allows a user to zoom in easily (especially on mobile)",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-LAN-014",
          "grupo": "landing",
          "subgrupo": "Image gallery",
          "texto": "There is a gallery with different product photos",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-015",
          "grupo": "landing",
          "subgrupo": "Image gallery",
          "texto": "The product gallery shows thumbnails of other available images",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-016",
          "grupo": "landing",
          "subgrupo": "Image gallery",
          "texto": "The product gallery contains product videos",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-017",
          "grupo": "landing",
          "subgrupo": "Image gallery",
          "texto": "The product gallery contains arrows to navigate between images",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-018",
          "grupo": "landing",
          "subgrupo": "Image gallery",
          "texto": "The product gallery supports swipe actions on mobile devices",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-019",
          "grupo": "landing",
          "subgrupo": "Image gallery",
          "texto": "There are images for different product variants/sizes",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-020",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "The main CTA is the most visible element on the product page and contains the \"cart\" icon",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-021",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "Product variants are easily accessible on mobile and big enough with enough white space around to prevent misclicks",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-022",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "The product variant selection is connected with the product gallery and shows images of chosen product variants",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-023",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "A visible reminder is included to select size/color if a customer forgets and clicks \"add to cart\" too early",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-024",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "Interactive selectors are used for product variants (the gallery image and the price are changed in real-time, without triggering a page reload)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-025",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "A size chart (or link that opens in a small popup and is easily closed on mobile) is provided near the size selections (for products with different sizes)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-026",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "Localized units for products are shown with different sizes/measurements (e.g. cm, inches, kg)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-027",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "Product descriptions mention the size of the model and the size of the shirt the model is wearing (only for apparel)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-028",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "Interactive selectors are used for quantity selection instead of dropdowns (the price and quantity are changed in real-time, without triggering a page reload)",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-LAN-029",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "The CTA copy clearly explains what will happen when you click on it (e.g. Proceed to secure checkout)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-030",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "The price of the product is prominent enough, especially if it's discounted",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-031",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "The price of the product is placed near the main CTA",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-032",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "The price of the product is localized",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-033",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "The background color of the product's primary CTA differs from other elements (e.g. slightly grey)",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-LAN-034",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "All additional charges that may apply near the main CTA are shown (e.g. additional shipping costs due to product size, VAT)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-035",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "If free shipping is offered, it's highlighted near the main CTA",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-036",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "All shipping information is shown near the main CTA (delivery to shopper's location, shopper's country flag, cost, time)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-037",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "Availability of the product is shown near the main CTA (e.g. \"In stock\")",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-038",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "The old price (with a strike-trough) is shown with the new price and how much shoppers will save (% or $) when the product is on sale",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-039",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "Clear information is shown about returns, refunds and money-back guarantee",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-040",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "Express payment options are shown and available that are commonly used (e.g. PayPal, Amazon, Google Pay, Apple Pay). Useful for direct-response landing pages",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-041",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "There is an option for a payment with installments (e.g. Klarna, AfterPay; for expensive products only). Useful for direct-response landing pages that don't encourage the user to add other products to the cart",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-042",
          "grupo": "landing",
          "subgrupo": "CTA area",
          "texto": "The landing page highlights the main benefits of shopping with you (e.g. \"Vegan friendly\", \"We give back to charity\", \"Not tested on animals\", \"19,222 products successfully shipped and delivered this month alone\")",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-043",
          "grupo": "landing",
          "subgrupo": "Social proof",
          "texto": "Product page highlights logos of news sites/blogs/celebrities where the product/brand has had PR exposure (e.g. \"Used by executives at Fortune 500\" )",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-LAN-044",
          "grupo": "landing",
          "subgrupo": "Social proof",
          "texto": "Customer reviews are shown with a review title, customer photos of product, star rating, photo of reviewer, name and last name, \"verified\" buyer, occupation, and age",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-045",
          "grupo": "landing",
          "subgrupo": "Social proof",
          "texto": "Customer reviews visually stand out from other content (ideally on a slightly yellow background)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-046",
          "grupo": "landing",
          "subgrupo": "Social proof",
          "texto": "Product page contains photos (with faces) of how (happy) customers are using the product",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-047",
          "grupo": "landing",
          "subgrupo": "Social proof",
          "texto": "Product overall star ratings are shown and can be filtered by the star rating",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-048",
          "grupo": "landing",
          "subgrupo": "Social proof",
          "texto": "Product page contains the number of customers this week/month/all-time (e.g. \"19,222 products successfully shipped and delivered this month alone\")",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-LAN-049",
          "grupo": "landing",
          "subgrupo": "Social proof",
          "texto": "Product page contains video testimonials",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-050",
          "grupo": "landing",
          "subgrupo": "Social proof",
          "texto": "Product page contains the number of Facebook and Twitter followers",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-LAN-051",
          "grupo": "landing",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "After the user clicks the \"Buy button\", they are taken to the upsell variant where you offer him a second item (of the same or complementary product) cheaper",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-052",
          "grupo": "landing",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Clear quantity discounts are offered near the main CTA (1x $24.99/piece, [\"Top choice\" badge]; 2x 19,99€/piece, [\"Recommended\" badge]; 3x $17,49/piece, [\"Best value\" badge])",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-053",
          "grupo": "landing",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Relevant cross-sell/up-sell products are offered",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-054",
          "grupo": "landing",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Relevant bundle products are offered with prominent discounts",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-055",
          "grupo": "landing",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Urgency triggers are used (e.g. \"Today only\", \"Black Friday offer\", \"Free bonus\", \"If order is placed in the next 12 min, it will be shipped today\") near the main CTA",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-056",
          "grupo": "landing",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Scarcity triggers are used (e.g. \"Only 3 products left\") near the main CTA",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-057",
          "grupo": "landing",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Customers are shown how many people have viewed and bought the product in the last 24 hours",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-058",
          "grupo": "landing",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "A store is giving away a small percentage of the profit to charity; and highlights this information",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-059",
          "grupo": "landing",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "The product page contains \"Visitors who viewed this product also viewed...\" where users are shown complementary OR/AND alternative products",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-060",
          "grupo": "landing",
          "subgrupo": "Product description",
          "texto": "The product description is easy to read (font size, contrast, single column, 75 characters per line, line-height 1.5, max. 4 lines long)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-061",
          "grupo": "landing",
          "subgrupo": "Product description",
          "texto": "Product information structure is easy to scan (grouped information, bullet points, important benefits highlighted)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-062",
          "grupo": "landing",
          "subgrupo": "Product description",
          "texto": "The sections of the page (\"General\", \"Technical info\") are grouped together in accordion (if they are longer) and scannable on mobile",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-063",
          "grupo": "landing",
          "subgrupo": "Product description",
          "texto": "Section titles explain benefits (and not features) of the product",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-064",
          "grupo": "landing",
          "subgrupo": "Product description",
          "texto": "Customers are shown all the things that are included in the product (ideally with an included photo)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-065",
          "grupo": "landing",
          "subgrupo": "Product description",
          "texto": "Product page contains customer FAQs (for each specific product as well as store-wide questions)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-066",
          "grupo": "landing",
          "subgrupo": "Product description",
          "texto": "The table of technical specifications is readable (different colors of lines, hover state of the line, not too far apart)",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-LAN-067",
          "grupo": "landing",
          "subgrupo": "Product description",
          "texto": "Product page offers product comparisons",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-LAN-068",
          "grupo": "landing",
          "subgrupo": "Product description",
          "texto": "Product description explains how to use the product in 3 easy steps",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-LAN-069",
          "grupo": "landing",
          "subgrupo": "Product description",
          "texto": "Product page contains embedded reviews (or screenshots) from social networks (e.g. Facebook post, Messenger, Whatsapp, Tweet, Instagram post, Instagram PM, Viber, sms)",
          "impacto": 3,
          "costo": 3
        }
      ]
    },
    {
      "id": "carrito",
      "nombre": "Carrito",
      "hoja": "🛒 Cart page",
      "verificaciones": [
        {
          "id": "CRO-CAR-001",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "The overall cart design is clear and uncluttered",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CAR-002",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "Urgency triggers are used (\"Your items are reserved for 10 minutes\", \"If you order in next 12 minutes, the order will be shipped today\")",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAR-003",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "The cart page clearly informs the user how far away they are from the threshold for free shipping (or a 3% discount)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CAR-004",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "If the user already reached the threshold for free shipping, the cart prominently highlights that (e.g. bold, green)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAR-005",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "When the user returns to the site, the items that they placed in the cart are still there",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CAR-006",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "All important product information is shown in the cart (title, image, chosen variant, quantity, price)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAR-007",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "The right product image is shown for the chosen product variant (e.g. Red dress)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAR-008",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "The cart allows you to change the quantity of the product and automatically updates the cart",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CAR-009",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "The user can easily remove an item from the cart",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAR-010",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "The cart shows the day of expected delivery",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAR-011",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "Scarcity triggers are shown next to each item (\"Only 1 item in stock\") in a prominent color (e.g. red, orange)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAR-012",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "The cart offers an easy way to get in touch with the store's help center (e.g. live chat, email, phone number)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CAR-013",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "Information about returns, refunds and a money-back guarantee is shown (if on external pages, a small pop-up window appears instead of redirecting the customer away from the cart)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAR-014",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "The cart offers a way to enter a coupon code but with a hidden input field (so users won't go searching for coupon codes on Google)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAR-015",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "The cart offers (inexpensive) upsell/cross-sell products with benefits and urgency (\"Now or never\") and a special discount (e.g. 50% OFF)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CAR-016",
          "grupo": "carrito",
          "subgrupo": "General",
          "texto": "Customers can “save products / cart for later” instead of deleting them",
          "impacto": 2,
          "costo": 3
        },
        {
          "id": "CRO-CAR-017",
          "grupo": "carrito",
          "subgrupo": "CTA area",
          "texto": "The subtotal price is prominent and placed near the main CTA",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAR-018",
          "grupo": "carrito",
          "subgrupo": "CTA area",
          "texto": "Estimated taxes are shown",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CAR-019",
          "grupo": "carrito",
          "subgrupo": "CTA area",
          "texto": "The shopper is shown how much they will save on their entire purchase near main CTA",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CAR-020",
          "grupo": "carrito",
          "subgrupo": "CTA area",
          "texto": "The main CTA includes what will happen next (\"Proceed to a secure checkout\") and is the most prominent element and duplicated at the top and bottom of the page",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CAR-021",
          "grupo": "carrito",
          "subgrupo": "CTA area",
          "texto": "The main CTA (\"Proceed to a secure checkout\") includes a lock icon on a distinctive (gray) background",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-CAR-022",
          "grupo": "carrito",
          "subgrupo": "CTA area",
          "texto": "Below the main CTA is a trust icon / seal badge (e.g. verified by Norton) along with reassuring copy \"Shop with confidence\"",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CAR-023",
          "grupo": "carrito",
          "subgrupo": "CTA area",
          "texto": "Alternative payment options are shown below the main CTA button (e.g. PayPal, Amazon Pay, Google Pay)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CAR-024",
          "grupo": "carrito",
          "subgrupo": "CTA area",
          "texto": "Images of all available installment methods are shown (e.g. Klarna) with clear monthly payment and duration info (especially useful for more expensive products)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CAR-025",
          "grupo": "carrito",
          "subgrupo": "CTA area",
          "texto": "A secondary CTA \"Continue shopping\" button is available on the cart page",
          "impacto": 2,
          "costo": 1
        }
      ]
    },
    {
      "id": "checkout",
      "nombre": "Checkout",
      "hoja": "💳 Checkout page",
      "verificaciones": [
        {
          "id": "CRO-CHE-001",
          "grupo": "checkout",
          "subgrupo": "General",
          "texto": "The checkout allows the user to make a purchase as a guest (avoids unnecessary registration)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CHE-002",
          "grupo": "checkout",
          "subgrupo": "General",
          "texto": "The site provides good feedback during checkout (e.g. a progress bar indicates where the user is in the checkout process)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-003",
          "grupo": "checkout",
          "subgrupo": "General",
          "texto": "If there is a multi-step checkout, it's clear what will happen after you click CTA",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CHE-004",
          "grupo": "checkout",
          "subgrupo": "General",
          "texto": "The form avoids making the user start again if there's an error",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-005",
          "grupo": "checkout",
          "subgrupo": "General",
          "texto": "Immediately prior to commiting to the purchase, the site shows the user a clear order summary",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-006",
          "grupo": "checkout",
          "subgrupo": "General",
          "texto": "Below the main CTA is a trust icon / seal badge (e.g. verified by Norton) along with reasurring copy \"Shop with confidence\"",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CHE-007",
          "grupo": "checkout",
          "subgrupo": "General",
          "texto": "Checkout doesn't contain any outgoing links (e.g. clickable logo, navigation and footer)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CHE-008",
          "grupo": "checkout",
          "subgrupo": "General",
          "texto": "The site's privacy policy is easy to find, especially on pages that ask for personal information, and the policy is simple and clear",
          "impacto": 2,
          "costo": 1
        },
        {
          "id": "CRO-CHE-009",
          "grupo": "checkout",
          "subgrupo": "General",
          "texto": "Checkout offers an easy way to get in touch with the store's help center (e.g. live chat, email, phone number)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CHE-010",
          "grupo": "checkout",
          "subgrupo": "General",
          "texto": "The main CTA is the most prominent element on the checkout page",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CHE-011",
          "grupo": "checkout",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "After the checkout page and before the thank you page, there is an upsell step where user can add another product to the existing order",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-012",
          "grupo": "checkout",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "The checkout page contains order bumps (e.g. \"Skip the queue\", \"Urgent shipping\", \"Gift packaging\", \"Package insurance\" with prices under $3)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CHE-013",
          "grupo": "checkout",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Urgency triggers are used (\"Your items are reserved for 10 minutes\", \"If your order is completed in the next 12 minutes, it will be shipped today\")",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-014",
          "grupo": "checkout",
          "subgrupo": "Log in and registration",
          "texto": "Checkout allows users to log in so they don't need to type in all the information again",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CHE-015",
          "grupo": "checkout",
          "subgrupo": "Log in and registration",
          "texto": "During registration, the password selection process is not overcomplicated with unnecessary requirements",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-016",
          "grupo": "checkout",
          "subgrupo": "Log in and registration",
          "texto": "Password recovery is easy",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CHE-017",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "The layout of input fields is as simple as possible (single column, ideally)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-018",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "The checkout page has the minimum amount of input fields needed for completing the purchase",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-019",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "The checkout page input fields are \"floating labels\" so the user can see the name of the field and its contents simultaneously",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CHE-020",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "The user's email address is requested first so in case they leave the checkout, the store is able to contact them",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-021",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "The input fields contain suggestions (Email: e.g. john.doe@gmail.com) to decrease the user's cognitive load",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CHE-022",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "The checkout page has an option to check \"the billing address is the same as shipping\", so the user doesn't need to enter the same address twice",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-023",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "Choosing a payment option (e.g. radio buttons) is easily accessible on mobile",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-024",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "Visual prompts are included for credit card details, such as an image of where to find the CVV code",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-025",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "Credit card input fields are shown on a gray background for higher (perceived) trust",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CHE-026",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "Users can easily jump between input fields of a form by using the \"Tab\" key",
          "impacto": 1,
          "costo": 2
        },
        {
          "id": "CRO-CHE-027",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "When entering data into a number-only input field (e.g. post code, phone number), a numeric keyboard is shown on mobile",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-CHE-028",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "When entering an email, a keyboard with dedicated buttons for @ and \".com\" is shown on mobile",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-CHE-029",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "Input-field width indicates the amount and format of data that needs to be entered (e.g. postal code input is smaller than address), including credit card inputs",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CHE-030",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "Optional and mandatory fields are easily distinguishable",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CHE-031",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "If we are asking for the phone number, we must explain beside/below the input that it's only for delivery information",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-CHE-032",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "Checkout is using a database of street addresses so the user cannot mistype the address",
          "impacto": 2,
          "costo": 3
        },
        {
          "id": "CRO-CHE-033",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "Input fields use inline validation with a prominent green/red border and arrow/x sign (e.g, if the email is correctly entered)",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-034",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "The error state of incorrectly filled out input fields clearly states what is wrong and how it should be corrected",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-035",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "The user does not need to enter the same information more than once",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-036",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "Checkout uses an auto-complete function wherever possible (e.g. when user types in the postal code, the city gets filled out automatically)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-CHE-037",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "If the user leaves the checkout and then returns, the input fields will have been saved so they can continue where they left off",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-CHE-038",
          "grupo": "checkout",
          "subgrupo": "Forms",
          "texto": "Input fields have an option (\"X\" icon at the right side) to delete the content with one click",
          "impacto": 2,
          "costo": 2
        }
      ]
    },
    {
      "id": "thankyou",
      "nombre": "Thank You",
      "hoja": "🙏 Thank you page",
      "verificaciones": [
        {
          "id": "CRO-THA-001",
          "grupo": "thankyou",
          "subgrupo": "General",
          "texto": "Thank you page clearly states that the user successfully completed the purchase and congratulates them",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-THA-002",
          "grupo": "thankyou",
          "subgrupo": "General",
          "texto": "Thank you page clearly sumarizes what was in the order",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-THA-003",
          "grupo": "thankyou",
          "subgrupo": "General",
          "texto": "Thank you page clearly states when the package will arrive and with what courier / delivery service",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-THA-004",
          "grupo": "thankyou",
          "subgrupo": "General",
          "texto": "Thank you page offers an easy way for the user to get in touch with the store owner(e.g. live chat, email, phone number)",
          "impacto": 3,
          "costo": 1
        },
        {
          "id": "CRO-THA-005",
          "grupo": "thankyou",
          "subgrupo": "General",
          "texto": "The thank you page explains to the user how they can track their package",
          "impacto": 2,
          "costo": 2
        },
        {
          "id": "CRO-THA-006",
          "grupo": "thankyou",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Thank you page offers the user to buy additional items/quantity of the same product at a lower price, or buy another complementary product, with a clear explanation that these additional items will be combined with their recently made order)",
          "impacto": 3,
          "costo": 3
        },
        {
          "id": "CRO-THA-007",
          "grupo": "thankyou",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "Thank you page offers the user a coupon code that they can use for their next purchase, or give it to their friends",
          "impacto": 3,
          "costo": 2
        },
        {
          "id": "CRO-THA-008",
          "grupo": "thankyou",
          "subgrupo": "Conversion and AOV 'boosters'",
          "texto": "The user receives a summary of all information in their confirmation email (product summary, upsells, coupon code that is on the thank you page, etc.)",
          "impacto": 3,
          "costo": 3
        }
      ]
    }
  ]
};
