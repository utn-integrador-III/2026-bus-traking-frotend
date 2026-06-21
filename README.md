# 2026-bus-traking-frotend

## Project Structure

This repository contains the frontend of the Real-Time Bus Tracking Application. The mobile application is built with React Native and is organized to support three main user roles: passengers, drivers, and administrators.

The project structure is designed to keep the code modular, scalable, and easy to maintain as the application grows.

```bash
src/
├── app/
├── auth/
├── navigation/
├── screens/
│   ├── passenger/
│   ├── driver/
│   └── admin/
├── components/
├── services/
├── hooks/
├── context/
├── types/
├── utils/
└── config/
```

### Folder Overview

#### `app/`
Contains global application configuration, role definitions, permissions, and general providers.

#### `auth/`
Contains authentication-related logic and screens, such as login, passenger registration, and protected access handling.

#### `navigation/`
Contains the navigation structure of the app, including role-based navigation for passengers, drivers, and administrators.

#### `screens/`
Contains the main application screens, organized by user role.

#### `screens/passenger/`
Contains screens for passengers, such as available trips, trip details, real-time map tracking, incident reports, notifications, and profile management.

#### `screens/driver/`
Contains screens for drivers, such as assigned trips, trip control, map view, start/end trip actions, and incident reporting.

#### `screens/admin/`
Contains screens for administrators, such as dashboard, trip management, route management, stop management, bus management, driver management, active trip monitoring, and report moderation.

#### `components/`
Contains reusable UI components used across the application, including map components, trip cards, report items, notification elements, and shared interface components.

#### `services/`
Contains communication logic for external services, including the backend API, Supabase, authentication, trips, locations, reports, notifications, and real-time updates.

#### `hooks/`
Contains custom React hooks used to reuse logic across the application, such as authentication state, role validation, real-time trip tracking, location tracking, and notifications.

#### `context/`
Contains global state providers, such as authentication context and trip context.

#### `types/`
Contains TypeScript types and interfaces for users, trips, routes, stops, buses, reports, and notifications.

#### `utils/`
Contains helper functions for dates, distances, role validation, form validation, and other reusable logic.

#### `config/`
Contains environment configuration, constants, and general application settings.

## Role-Based Organization

The application separates screens and features according to the authenticated user role.

### Passenger

Passengers can view available trips, follow a bus in real time, receive notifications, select stops, and report incidents.

### Driver

Drivers can view assigned trips, start and end trips, send real-time GPS location updates, and report critical incidents.

### Administrator

Administrators can manage trips, routes, stops, buses, and drivers. They can also monitor active trips and review user reports.

## Frontend Responsibilities

The frontend is responsible for displaying the mobile interface for passengers, drivers, and administrators.

It also handles authentication, role-based navigation, trip visualization, real-time map tracking, GPS updates, incident reports, push notifications, and communication with the backend API.

## Main responsibilities include:

- Displaying the mobile user interface.
- Handling login and passenger registration.
- Managing navigation based on the authenticated user role.
- Showing available trips and trip details.
- Displaying bus location, official stops, and route information on a map.
- Sending the driver's GPS location while a trip is active.
- Listening to real-time trip updates through Supabase Realtime.
- Allowing passengers and drivers to submit incident reports.
- Receiving and displaying push notifications.
- Communicating with the backend API for business logic and complex operations.

## Development Notes

This structure separates responsibilities clearly across the project.

Screens are organized by user role. Reusable interface elements are placed in `components/`. External communication is handled through `services/`. Shared logic is placed in `hooks/`. Global state is handled in `context/`. Common definitions are stored in `types/`, `utils/`, and `config/`.

This organization allows the project to grow in a clean and maintainable way without mixing user interface, navigation, business logic, and external service communication.