# Manual de Despliegue - Monterrey CRM

Este manual explica cómo instalar y ejecutar el sistema Monterrey CRM en una computadora o servidor completamente nuevo, **sin necesidad de instalar Node.js ni MongoDB manualmente**.

El sistema utiliza **Docker**, lo que paquetea todo lo necesario (Base de datos, Servidor Web, Librerías) en contenedores listos para usar.

---

## FASE 1: Preparación del Servidor (Nueva PC)

Solo necesitas instalar dos programas en la computadora nueva:

### 1. Instalar Docker
Docker es el motor que ejecutará el sistema.

*   **Si usas Windows:**
    1.  Descarga **Docker Desktop**: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
    2.  Instálalo (asegura marcar la opción de WSL 2 si te la pide).
    3.  Abre Docker Desktop y espera a que el icono de la ballena en la barra de tareas esté verde o diga "Engine Running".

*   **Si usas Linux (Ubuntu/Debian):**
    ```bash
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    ```

### 2. Instalar Git
Necesario para descargar el código del sistema.

*   **Windows:** Descarga e instala desde [https://git-scm.com/downloads](https://git-scm.com/downloads).

---

## FASE 2: Instalación del Sistema

1.  **Crear una carpeta para el proyecto:**
    Crea una carpeta en el Escritorio o Documentos llamada `monterrey-crm`.

2.  **Abrir la Terminal:**
    *   En Windows: Entra a esa carpeta, haz clic derecho y elige "Open Git Bash Here" (o usa PowerShell).

3.  **Descargar el Código:**
    Escribe el siguiente comando (te pedirá tu usuario y contraseña de GitHub):
    ```bash
    git clone https://github.com/Luiszaera98/monterrey-crm.git .
    ```
    *(Nota el punto al final para que se baje en la carpeta actual)*.

4.  **Configurar Variables de Entorno (Opcional):**
    El sistema ya viene configurado para producción, pero si necesitas cambiar algo, puedes crear un archivo `.env.local` basado en el ejemplo, pero **no es estrictamente necesario** para que arranque la primera vez, ya que Docker maneja la conexión a la base de datos interna.

---

## FASE 3: Ejecución (Despliegue)

Este es el paso mágico. Docker descargará e instalará todo automáticamente.

1.  En la terminal (dentro de la carpeta del proyecto), ejecuta:

    ```bash
    docker compose -f docker-compose.prod.yml up -d --build
    ```

    *   **¿Qué hace esto?**
        *   Descarga la base de datos MongoDB.
        *   Compila la aplicación Next.js optimizada.
        *   Inicia todo en segundo plano.

2.  **Espera unos minutos.** La primera vez toma tiempo descargar y compilar.

3.  **Verificar:**
    Ejecuta:
    ```bash
    docker compose -f docker-compose.prod.yml ps
    ```
    Deberías ver que `monterrey_crm_app` y `monterrey_mongodb` están en estado "Up".

---

## FASE 4: Usar el Sistema

1.  Abre el navegador (Chrome, Edge).
2.  Escribe: `http://localhost:3000`
3.  ¡Listo!

**Para acceder desde otros dispositivos en la misma red:**
1.  Averigua la IP de la computadora servidor (en terminal escribe `ipconfig` y busca "IPv4 Address", ej: `192.168.1.15`).
2.  En el celular u otra laptop escribe: `http://192.168.1.15:3000`

---

## Mantenimiento

**Si subes cambios a GitHub y quieres actualizar el servidor:**
```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

**Si necesitas reiniciar el servidor:**
```bash
docker compose -f docker-compose.prod.yml restart
```
