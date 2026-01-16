# Manual de Despliegue - Monterrey CRM

Este manual explica cómo instalar y ejecutar el sistema Monterrey CRM en un servidor o computadora nueva. El sistema utiliza **Docker**, lo que facilita la instalación al incluir todas las dependencias (Base de datos, Node.js, etc.) en contenedores.

> **RECOMENDACIÓN:** Para un servidor dedicado (CPU viejo o nuevo) que debe ser estable y rápido, se recomienda encarecidamente usar la **Opción A (Ubuntu Server)**.

---

## OPCIÓN A: Instalación en Ubuntu Server (Recomendada)
*Ideal para servidores dedicados, CPUs viejos, bajo consumo de recursos y estabilidad.*

### 1. Preparación del Sistema Operativo
Se asume que ya instalaste Ubuntu Server en la máquina.

1.  **Accede a la terminal** del servidor (ya sea directamente o vía SSH).
2.  **Actualiza el sistema:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```
3.  **Instala Docker y Git:**
    ```bash
    # Instalar Docker con el script automático oficial
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh

    # Instalar Git
    sudo apt install git -y
    ```
4.  **(Opcional) Instalar Tailscale para acceso remoto seguro:**
    Si deseas administrar este servidor desde fuera de la red local sin abrir puertos:
    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up
    # Sigue el link que aparece para autenticarte con tu cuenta
    ```

### 2. Descargar e Instalar el CRM
1.  **Crear carpeta y descargar código:**
    ```bash
    mkdir monterrey-crm
    cd monterrey-crm
    # Te pedirá usuario (tu correo/user) y contraseña (tu Token de Acceso Personal)
    git clone https://github.com/Luiszaera98/monterrey-crm.git .
    ```

2.  **Configurar Seguridad (IMPORTANTE):**
    Antes de iniciar, debes configurar las contraseñas de la base de datos.
    ```bash
    # Copia el archivo de ejemplo
    cp .env.example .env

    # Edita el archivo para poner tu contraseña
    nano .env
    ```
    *Dentro del editor, cambia `DB_PASSWORD=...` y `DB_USER=...` por valores seguros. Guarda con Ctrl+O y sal con Ctrl+X.*

3.  **Desplegar (Iniciar el sistema):**
    ```bash
    # Necesitas permisos de superusuario (sudo) para docker en Linux por defecto
    sudo docker compose -f docker-compose.prod.yml up -d --build
    ```
    *Espera unos minutos mientras descarga y compila todo.*

3.  **Verificar que esté corriendo:**
    ```bash
    sudo docker compose -f docker-compose.prod.yml ps
    ```

______________________________________________________________________

## OPCIÓN B: Instalación en Windows
*Úsalo si necesitas usar la PC para otras cosas gráficas además de ser servidor, o si no te sientes cómodo con Linux.*

### 1. Prerrequisitos
1.  Descarga e instala **Docker Desktop para Windows**: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2.  Descarga e instala **Git**: [https://git-scm.com/downloads](https://git-scm.com/downloads)
3.  Abre Docker Desktop y asegúrate de que esté corriendo (icono verde).

### 2. Descargar e Instalar el CRM
1.  Crea una carpeta en el Escritorio llamada `monterrey-crm`.
2.  Entra a la carpeta, haz clic derecho y selecciona **"Open Git Bash Here"**.
3.  **Descargar código:**
    ```bash
    git clone https://github.com/Luiszaera98/monterrey-crm.git .
    ```

4.  **Configurar Seguridad:**
    1.  Busca el archivo `.env.example` en la carpeta.
    2.  Haz una copia y renómbralo a `.env`.
    3.  Ábrelo con el Bloc de Notas y cambia `DB_PASSWORD` por una contraseña segura. Guárdalo.

5.  **Desplegar (Iniciar el sistema):**
    En la misma terminal de Git Bash:
    ```bash
    docker compose -f docker-compose.prod.yml up -d --build
    ```

______________________________________________________________________

## Cómo Acceder al Sistema

Una vez instalado (en Ubuntu o Windows), el acceso es igual:

### Desde la misma PC (Localhost):
Abre el navegador y ve a:
`http://localhost:3000`

### Desde otros dispositivos en la red (LAN):
1.  Averigua la IP del servidor:
    *   **Ubuntu:** Escribe `ip a` en la terminal (busca algo como `192.168.1.X`).
    *   **Windows:** Escribe `ipconfig` en la terminal (busca "IPv4 Address").
2.  En el otro dispositivo (celular, laptop), escribe en el navegador:
    `http://192.168.1.X:3000` (Reemplaza X por el número correcto).

**Nota:** Si usaste la Opción A con **Tailscale**, puedes acceder remotamente (fuera de casa) usando la IP que te da Tailscale (ej. `http://100.x.x.x:3000`).

---

## Mantenimiento y Actualizaciones

Para actualizar el sistema cuando subas cambios a GitHub:

**En Ubuntu:**
```bash
cd ~/monterrey-crm
git pull
sudo docker compose -f docker-compose.prod.yml up -d --build
```

**En Windows:**
```bash
# Abre Git Bash en la carpeta
git pull
docker compose -f docker-compose.prod.yml up -d --build
```
