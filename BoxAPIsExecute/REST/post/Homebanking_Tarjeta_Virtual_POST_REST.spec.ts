curl -X 'POST' \
'https://homebanking-demo.onrender.com/pagos/servicios' \
-H 'accept: application/json' \
-H 'Content-Type: application/json' \
-d '{
"id_cuenta": "ACC001",
"id_servicio": "SRV001",
"monto": 8500
}'