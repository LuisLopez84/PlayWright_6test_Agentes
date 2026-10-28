# BoxTestData/ — Datos variables para pruebas UI y API

Aquí se declaran **sets de datos** (`.csv`, `.txt` o `.xlsx`) para ejecutar el mismo flujo UI o la misma prueba de API **una vez por cada fila** del archivo, con valores distintos.

## Convención

- **Nombre del archivo = nombre exacto de la suite** (el mismo nombre del recording / carpeta en `GenerateTest/tests/`).
  Ej: `Homebanking_TransferenciasTestingQA.csv` alimenta la suite `Homebanking_TransferenciasTestingQA`.
- **Por defecto, un solo archivo por suite**, compartido entre UI y API — las mismas columnas alimentan lo que cada tipo de prueba necesite.
- **Primera fila = encabezados** (nombre de columna). Cada fila siguiente = una ejecución.
- Formatos soportados: `.csv`, `.txt` (separador detectado automáticamente: coma, tabulación o `;`) y `.xlsx` (primera hoja, primera fila = encabezados).

### Sets de datos separados por tipo de prueba (opcional)

Si necesitas que UI, REST y SOAP usen **datos distintos** para la misma suite (columnas diferentes, o los mismos nombres de columna pero valores que no deben mezclarse), agrega un sufijo al nombre del archivo:

| Sufijo | Tipo de prueba | Ejemplo |
|---|---|---|
| `_Web` o `_UI` | Solo UI | `Homebanking_Tarjeta_Virtual_Web.csv` |
| `_REST` | Solo API REST | `Homebanking_Tarjeta_Virtual_REST.csv` |
| `_SOAP` | Solo API SOAP | `Homebanking_Tarjeta_Virtual_SOAP.csv` |
| `_API` | API REST **y** SOAP (compartido entre ambos, distinto de UI) | `Homebanking_Tarjeta_Virtual_API.csv` |
| *(sin sufijo)* | Compartido entre UI, REST y SOAP | `Homebanking_Tarjeta_Virtual.csv` |

**Orden de búsqueda**: cada tipo de prueba busca primero su archivo específico y, si no existe, cae automáticamente al archivo sin sufijo. Puedes mezclar: por ejemplo, tener solo `_Web.csv` y `_SOAP.csv` (como en el ejemplo de abajo) y dejar que REST, si algún día lo necesita, use el archivo sin sufijo si existiera, o simplemente no tenga datos variables si no existe ninguno de los dos.

**Ejemplo real (`Homebanking_Tarjeta_Virtual`)**:
```
BoxTestData/
├── Homebanking_Tarjeta_Virtual_Web.csv    ← Usuario,Contraseña       (solo UI)
└── Homebanking_Tarjeta_Virtual_SOAP.csv   ← intA,intB                (solo SOAP)
```
`npm run generate` genera 2 ejecuciones del flujo UI con Usuario/Contraseña, y 2 ejecuciones del test "SOAP Add - Éxito" con intA/intB — completamente independientes entre sí, sin que las columnas de uno interfieran con el otro.

## Cómo se usan los datos (sin tocar código)

1. **UI** (`npm run generate`): por cada campo del flujo grabado (`smartFill`/`smartSelect`), el framework compara el nombre visible del campo (ej. el `name` de `getByRole('textbox', { name: 'Usuario' })`) contra los encabezados del archivo — primero con un match exacto/por contención, y si no encuentra nada, con una consulta a la IA (si `OPENAI_API_KEY` está configurada). Las columnas que sí emparejan generan un **loop**: un `test()` por fila, con ese valor; las que no emparejan con ninguna columna simplemente conservan el valor grabado originalmente.
2. **API generada desde `BoxAPIsExecute/`** (curl pegado): mismo mecanismo, pero comparando contra las claves del body JSON (REST) o los tags hoja del XML (SOAP). Solo el test "Éxito" se repite por fila — los tests de error técnico / error de datos no varían (no aporta repetirlos con distintos datos).
3. **API manual** (`GenerateTest/api-testing-rest-soap/`): no se genera nada automáticamente — el tester importa el archivo él mismo:

   ```typescript
   import { loadSuiteTestData } from '../../../../ConfigurationTest/tests/utils/data-file-parser';

   // Sin tercer argumento: busca solo el archivo sin sufijo (comportamiento histórico).
   const data = loadSuiteTestData('Homebanking_TransferenciasTestingQA');

   // Con tercer argumento ('ui' | 'rest' | 'soap'): busca primero la variante con
   // sufijo de ese tipo y cae al archivo sin sufijo si no existe — igual que hacen
   // internamente el generador de UI y el de BoxAPIsExecute.
   const soapData = loadSuiteTestData('Homebanking_Tarjeta_Virtual', undefined, 'soap');

   for (const [i, row] of data.entries()) {
     test(`POST /transferencias - fila ${i + 1}`, async ({ request }) => {
       const response = await restRequest(request, 'POST', url, {
         data: { monto: row['Monto'], cuenta_destino: row['cuenta_destino'] },
       });
       expect(response.status()).toBe(200);
     });
   }
   ```

## Ejemplo real (`Homebanking_TransferenciasTestingQA.csv`)

```csv
Usuario,Contraseña,Monto,Descripción (opcional)
demo,demo123,500,Transferencia prueba DDT fila 1
demo,demo123,1200,Transferencia prueba DDT fila 2
demo,demo123,2500,Transferencia prueba DDT fila 3
```

Al ejecutar `npm run generate` con este archivo presente, el spec UI generado corre el flujo de transferencia **3 veces**, una por cada fila, variando `Monto` y `Descripción`.

## Reporte

- **UI**: `npm run portal` muestra un panel "📋 Datos de prueba — Fila N/M" debajo de cada ejecución, con la columna→valor exacta que se usó.
- **API**: el panel de Request/Response que ya existe en el portal muestra el body real enviado en cada fila — no hace falta nada adicional.

## Notas

- Si una columna del archivo no logra emparejar con ningún campo/clave, se ignora y queda un `console.warn` durante `npm run generate` indicando cuál — no rompe la generación.
- Si **no** existe archivo de datos para una suite, todo se comporta exactamente igual que siempre (una sola ejecución, valores grabados/del curl).
- Los specs de UI y de API-desde-curl se **sobreescriben en cada `npm run generate`** (igual que hoy) — para cambiar los datos, edita el `.csv`/`.txt`/`.xlsx` y vuelve a generar. No edites el loop generado a mano.
