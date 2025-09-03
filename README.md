# Laboratorio Clínico Sangre Cristo

## Cambios realizados por Anderson

**Problema identificado:**  
Al iniciar sesión, los datos del usuario se guardan en el `localStorage`, lo cual no es seguro.

**Ubicación del problema:**  
El error está en `App.js` debido al uso de `AsyncStorage`.

**Solución propuesta:**  
- Modificar el método `useEffect`.  
- Ajustar las funciones `handleLoginSuccess` y `handleLogout`.  
- Objetivo: que en el `localStorage` **no se guarde ningún dato** del usuario.
  
<img width="1828" height="760" alt="consola1" src="https://github.com/user-attachments/assets/03f82d0f-90b8-4315-bb21-52d49db3f7c1" />

<img width="1823" height="819" alt="consola2" src="https://github.com/user-attachments/assets/b84a011a-c0c7-4ea1-a0fe-bcecda52e484" />

<img width="385" height="611" alt="error1" src="https://github.com/user-attachments/assets/a8ba1d82-04bc-40a8-b694-3d34a1b36245" />

<img width="560" height="645" alt="error2" src="https://github.com/user-attachments/assets/e634e0e1-6c9c-49bd-ab58-3cf7ff93deca" />
