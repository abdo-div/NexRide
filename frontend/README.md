# NexRide frontend

The NexRide frontend is the customer-facing vehicle-rental marketplace and operations interface. Customers can browse vehicles, manage bookings, and pay for bookings; authorized platform administrators can use the operations dashboard.

## Stack

- React 19 and TypeScript
- Vite 8
- React Router
- Tailwind CSS
- i18next and react-i18next (English and Arabic)

## Install and configure

```powershell
Set-Location frontend
npm ci
Copy-Item .env.example .env.local
```

The supported frontend environment variable is:

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend API base URL, without a trailing slash. Defaults to `http://localhost:3000/api/v1`. |

Do not put secrets in frontend environment files: Vite embeds `VITE_*` values in browser assets.

## Development and checks

Run the development server:

```powershell
npm run dev
```

The Vite development server uses its default local address (normally `http://localhost:5173`).

Available package scripts:

```powershell
npm run typecheck
npm run lint
npm run build
npm run preview
```

`typecheck` runs the TypeScript project checks, `lint` runs ESLint, and `build` type-checks then creates the production bundle in `dist/`. `preview` serves that built bundle locally; run it after `npm run build`.

## Application areas

Routes are defined in `src/App.tsx`:

- `/`, `/fleet` and `/FleetPage` — home and vehicle listings
- `/cars/:vehicleId` and `/vehicles/:vehicleId` — vehicle details
- `/checkout/:vehicleId`, `/payment/:bookingId`, and `/booking-confirmed/:vehicleId` — protected booking checkout, payment, and confirmation
- `/login` and `/auth` — sign-in/sign-up; `/reset-password/:token` — password reset
- `/my-bookings` and `/my-bookings/:bookingId` — protected customer booking list and details
- `/admin` — administrator-only overview; the dashboard includes bookings and booking details, companies, vehicles, customers, payments, commissions, maintenance, reports, and settings

Admin pages are loaded on navigation rather than included up front in the main route bundle. Admin routes retain the client-side admin guard; the backend independently enforces authorization for protected API operations.

## Authentication and API communication

The auth provider restores a saved token by checking the current user with the backend. Sign-in and sign-up save the returned token in browser storage; API requests send it as a Bearer token and include credentials for the HTTP-only cookie. Protected customer routes require an authenticated session, while `/admin` additionally requires the `admin` role.

The frontend communicates with the Express API through the shared API client. Set `VITE_API_BASE_URL` to the backend API base (for example, `http://localhost:3000/api/v1`) when it is not running at the default address.

## Payments

Checkout creates a booking and the payment page initiates the configured gateway flow. Moamalat’s Lightbox is loaded by the browser, but payment verification and booking/payment finalization are performed by the backend. The frontend does not contain gateway secrets.
