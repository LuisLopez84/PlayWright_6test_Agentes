curl -X 'POST' \
'https://homebanking-demo.onrender.com/transferencias/' \
-H 'accept: application/json' \
-H 'Content-Type: application/json' \
-d '{
"cuenta_destino": "ACC002",
"cuenta_origen": "ACC001",
"monto": 1500,
"motivo": "Varios",
"tipo": "propia"
}'