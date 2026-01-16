# 🚀 Guía de Migración a MongoDB

## ✅ Lo que ya está implementado:

1. **Conexión a MongoDB** (`src/lib/db.ts`)
2. **Modelos de Mongoose** (`src/models/index.ts`):
   - Client
   - Product
   - Invoice
   - Payment
   - CreditNote
   - Expense

3. **Docker Compose actualizado**:
   - Servicio MongoDB incluido
   - Variables de entorno configuradas
   - Volumen persistente para datos

4. **Package.json actualizado** con mongoose

---

## 📋 Pasos para completar la migración:

### Paso 1: Instalar dependencias

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

O si trabajas localmente sin Docker:

```bash
npm install
```

### Paso 2: Migrar las acciones (Actions)

Necesitas actualizar CADA archivo en `src/lib/actions/` para usar MongoDB en lugar de MOCK:

#### Ejemplo - invoiceActions.ts:

**ANTES (MOCK):**
```typescript
const MOCK_INVOICES: Invoice[] = [];

export async function getInvoices() {
    return MOCK_INVOICES;
}
```

**DESPUÉS (MongoDB):**
```typescript
import dbConnect from '@/lib/db';
import { Invoice as InvoiceModel } from '@/models';

export async function getInvoices() {
    await dbConnect();
    const invoices = await InvoiceModel.find({}).lean();
    return invoices.map(inv => ({
        ...inv,
        id: inv._id.toString(),
        _id: undefined
    }));
}
```

### Paso 3: Archivos a migrar

Actualiza estos archivos uno por uno:

- [ ] `src/lib/actions/clientActions.ts`
- [ ] `src/lib/actions/inventoryActions.ts`
- [ ] `src/lib/actions/invoiceActions.ts`
- [ ] `src/lib/actions/paymentActions.ts`
- [ ] `src/lib/actions/expenseActions.ts`
- [ ] `src/lib/actions/authActions.ts` (opcional - para usuarios en DB)

### Paso 4: Patrón de conversión

Para CADA función de acción:

1. Importar `dbConnect` y el modelo correspondiente
2. Llamar `await dbConnect()` al inicio
3. Reemplazar operaciones MOCK con operaciones de Mongoose:
   - `MOCK_ARRAY.push()` → `Model.create()`
   - `MOCK_ARRAY.find()` → `Model.find()`
   - `MOCK_ARRAY.filter()` → `Model.findById()`
   - etc.

---

## 🔧 Comandos útiles

### Ver logs de MongoDB:
```bash
docker logs monterrey_mongodb
```

### Conectarse a MongoDB:
```bash
docker exec -it monterrey_mongodb mongosh
```

### Backup de base de datos:
```bash
docker exec monterrey_mongodb mongodump --out /backup
```

---

## 🌐 Opciones de MongoDB

### Opción A: Local (actual)
- ✅ Ya configurado en docker-compose
- ✅ Datos persisten en volumen Docker
- ❌ Solo local, no accesible remotamente

### Opción B: MongoDB Atlas (Cloud Free)
1. Ir a https://www.mongodb.com/cloud/atlas
2. Crear cuenta gratuita
3. Crear cluster (M0 FREE)
4. Obtener connection string
5. Actualizar `.env.local`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/monterrey_crm
   ```

---

## ⚠️ IMPORTANTE

Los errores de TypeScript sobre 'mongoose' se resolverán cuando ejecutes:
```bash
npm install
```

**Después de instalar, deberás migrar las acciones manualmente o puedo ayudarte a hacerlo.**

---

## 🚀 Para empezar

1. Detén Docker si está corriendo
2. Ejecuta:
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up
   ```

3. La base de datos estará vacía inicialmente
4. Puedes mantener los MOCK temporalmente o migrar ahora

**¿Quieres que migre las acciones ahora o prefieres hacerlo gradualmente?**
