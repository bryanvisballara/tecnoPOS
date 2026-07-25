# TecnoPOS

**TU NEGOCIO, EN CONTROL**

Plataforma multi-sede para cadenas de restaurantes: POS, mesas, cocina (KDS), caja, inventario, recetario con food cost, clientes y KPIs consolidados/individuales.

## Stack

- **Frontend:** React + Vite (PWA / WebView ready)
- **Backend:** Node.js + Express + Socket.IO
- **DB:** MongoDB Atlas

## Módulos

| Módulo | Descripción |
|--------|-------------|
| Multi-sede | Organización con N restaurantes y KPIs consolidados |
| Roles | Dueño cadena, gerente, mesero, cocina, caja |
| Mesas | Plano de salón con estados (libre/ocupada/cuenta/sucia) |
| POS | Toma de pedidos, envío a cocina, cobro |
| KDS | Pantalla de cocina en tiempo real |
| Caja | Apertura/cierre de turno y arqueo |
| Inventario | Stock por sede, compras, mermas, alertas de par |
| Recetas | BOM + costeo teórico por porción |
| Menú | Catálogo centralizado con 86 (agotado) |
| Clientes | CRM básico y gasto acumulado |

## Desarrollo local

```bash
cp .env.example .env   # configurar MONGODB_URI y JWT_SECRET
npm run install:all
npm run seed           # opcional si SEED_ON_BOOT=false
npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:10000/api/health  

## Usuarios demo

Contraseña de todos: `TecnoPOS2026!`

| Rol | Email |
|-----|-------|
| Dueño cadena | owner@tecnopos.app |
| Gerente | gerente@tecnopos.app |
| Mesero | mesero@tecnopos.app |
| Cocina | cocina@tecnopos.app |
| Caja | caja@tecnopos.app |

## Deploy (Render)

1. Variables de entorno: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `SEED_ON_BOOT=true`
2. Build Command: `npm install && npm run build`
3. Start Command: `node server/src/index.js`

Deploy hook del servicio:

```
https://api.render.com/deploy/srv-d9i2643tqb8s73eb0te0?key=Y3SJrBcXYn0
```
