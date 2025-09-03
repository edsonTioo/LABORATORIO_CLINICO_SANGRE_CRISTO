import React, { useEffect,useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Toast from 'react-native-toast-message';
import { BaseToast, ErrorToast } from 'react-native-toast-message';
import PacientesRegistradosScreen from './app/components/componenteReporte/PacientesRegistradosScreen';
import TopMedicosScreen from './app/components/componenteReporte/TopMedicosScreen';
import ExamenesMasSolicitadosScreen from './app/components/componenteReporte/ExamenesMasSolicitadosScreen';
import PagosPendientesScreen from './app/components/componenteReporte/PagosPendientesScreen';
import ReportePacientesMasExamenesScreen from './app/components/componenteReporte/ReportePacientesMasExamenesScreen';
import GananciasExamenScreen from './app/components/componenteReporte/GananciasExamenScreen';
import ReporteGananciasScreen from './app/components/componenteReporte/ReporteGananciasScreen';
import { TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native';
import CrearClientesScreend from './app/components/ComponentsClientes/CrearClientesScreend';
import EditarClienteScreen from './app/components/ComponentsClientes/EditarClienteScreen';
import ClienteScreen from './app/screen/ClienteScreen';



import CrearMuestraScreen from './app/components/componentsMuestras/CrearMuestraScreen';
import EditarMuestraScreend from './app/components/componentsMuestras/EditarMuestraScreend';



import CreateParametroScreen from './app/components/componentsParametros/CreateParametroScreen';
import EditParametroScreen from './app/components/componentsParametros/EditParametroScreen';

import CrearTipoExamenScreend from './app/components/componenteTipoExamen/CrearTipoExamenScreend';
import EditarTipoExamenScreen from './app/components/componenteTipoExamen/EditarTipoExamenScreen';

import CrearMedicoScreen from './app/components/ComponentsMedico/CrearMedicoScreen';
import EditarMedicoScreen from './app/components/ComponentsMedico/EditarMedicoScreen';

import RestablecerScreen from './app/auth/RestablecerScreen';


import LoginScreen from './app/auth/LoginScreen';
import HomeScreen from './app/screen/HomeScreen';
import UserScreen from './app/screen/UserScreen';
import ParametroScreen from './app/screen/ParametroScreen';
import ResultadoScreen from './app/screen/ResultadoScreen';
import MuestraScreen from './app/screen/MuestraScreen';
import FacturaScreen from './app/screen/FacturaScreen';
import OrdenScreen from './app/screen/OrdenScreen';
import TipoExamenScreen from './app/screen/TipoExamenScreen';
import ReporteScreen from './app/screen/ReporteScren';
import UpdatePasswordScreen from './app/screen/UpdatePasswordScreen';
import ResultadoExamenesScreen from './app/screen/ResultadoExamenesScreen';
import HistorialClinicoScreen from './app/screen/HistorialClinicoScreen';
import AnularOrdenScreen from './app/screen/AnularOrdenScreen';
import UpdateResultado from './app/screen/UpdateResultados';


import { DefaultTheme, Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const toastConfig = {
  // Toast INFORMATIVO (azul) - Para mensajes neutros
  info: (props) => (
    <BaseToast
      {...props}
      style={{
        height: 80,
        width: '50%',
        borderLeftColor: '#3498db', // Borde azul
        backgroundColor: '#EBF5FB', // Fondo azul claro
      }}
      text1Style={{ fontSize: 18, fontWeight: 'bold', color: '#2874A6' }}
      text2Style={{ fontSize: 16, color: '#2980B9' }}
    />
  ),

  // Toast de ÉXITO (verde) - Para guardar, actualizar, etc.
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        height: 80,
        width: '50%',
        borderLeftColor: '#2ecc71', // Borde verde
        backgroundColor: '#E8F8F5', // Fondo verde claro
      }}
      text1Style={{ fontSize: 18, fontWeight: 'bold', color: '#27AE60' }}
      text2Style={{ fontSize: 16, color: '#229954' }}
    />
  ),

  // Toast de ERROR (rojo) - Para eliminar, errores críticos
  error: (props) => (
    <ErrorToast // 👈 Usa ErrorToast (ya tiene estilos predeterminados de error)
      {...props}
      style={{
        height: 80,
        width: '50%',
        borderLeftColor: '#e74c3c', // Borde rojo
        backgroundColor: '#FDEDEC', // Fondo rojo claro
      }}
      text1Style={{ fontSize: 18, fontWeight: 'bold', color: '#C0392B' }}
      text2Style={{ fontSize: 16, color: '#E74C3C' }}
    />
  ),

  // Toast de ADVERTENCIA (naranja/amarillo) - Para validaciones o alertas
  warning: (props) => (
    <BaseToast
      {...props}
      style={{
        height: 80,
        width: '50%',
        borderLeftColor: '#f39c12', // Borde naranja
        backgroundColor: '#FEF9E7', // Fondo amarillo claro
      }}
      text1Style={{ fontSize: 18, fontWeight: 'bold', color: '#D35400' }}
      text2Style={{ fontSize: 16, color: '#F39C12' }}
    />
  ),
};

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200ee',
    accent: '#03dac4',
  },
};


function withAutoReload(Component) {
  return function WrappedComponent(props) {
    const [key, setKey] = React.useState(0);

    useFocusEffect(
      useCallback(() => {
        setKey(prevKey => prevKey + 1);
        return () => { };
      }, [])
    );

    return <Component key={key} {...props} />;
  };
}


function MainDrawerNavigator({ route }) {
  const { userData, handleLogout } = route.params;

  // Pantallas comunes para ambos roles
  const commonScreens = [

    {
      name: "Home",
      component: withAutoReload(HomeScreen),
      options: {
        drawerLabel: 'Inicio',
        drawerIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />
      }
    },
    {
      name: "Perfil",
      component: UpdatePasswordScreen,
      options: {
        drawerLabel: 'Mi Perfil',
        drawerIcon: ({ color, size }) => <Icon name="user" size={size} color={color} />
      }
    }
  ];

  // Pantallas exclusivas para ADMIN
  const adminScreens = [
    {
      name: "Medico",
      component: UserScreen,
      options: {
        drawerLabel: 'Médicos',
        drawerIcon: ({ color, size }) => <Icon name="user-md" size={size} color={color} />
      }
    },
    {
      name: "Cliente",
      component: ClienteScreen,
      options: {
        drawerLabel: 'Clientes',
        drawerIcon: ({ color, size }) => <Icon name="users" size={size} color={color} />
      }
    },
    {
      name: "Parametro",
      component: ParametroScreen,
      options: {
        drawerLabel: 'Parámetros',
        drawerIcon: ({ color, size }) => <Icon name="cogs" size={size} color={color} />
      }
    },
    {
      name: "Muestra",
      component: MuestraScreen,
      options: {
        drawerLabel: 'Muestras',
        drawerIcon: ({ color, size }) => <Icon name="flask" size={size} color={color} />
      }
    },
    {
      name: "TipoExamen",
      component: TipoExamenScreen,
      options: {
        drawerLabel: 'Tipos de Examen',
        drawerIcon: ({ color, size }) => <Icon name="list" size={size} color={color} />
      }
    },
    {
      name: "Reporte",
      component: ReporteScreen,
      options: {
        drawerLabel: 'Reportes',
        drawerIcon: ({ color, size }) => <Icon name="bar-chart" size={size} color={color} />
      }
    }, {
      name: "Resultado",
      component: ResultadoScreen,
      options: {
        drawerLabel: 'Realizar Resultados',
        drawerIcon: ({ color, size }) => <Icon name="clipboard" size={size} color={color} />
      }
    },
    {
      name: "UpdateResultado",
      component: UpdateResultado,
      options: {
        drawerLabel: 'Actualizar Resultados',
        drawerIcon: ({ color, size }) => <Icon name="edit" size={size} color={color} />
      }
    },
    {
      name: "Factura",
      component: FacturaScreen,
      options: {
        drawerLabel: 'Facturas',
        drawerIcon: ({ color, size }) => <Icon name="file-text" size={size} color={color} />
      }
    },
    {
      name: "Orden",
      component: OrdenScreen,
      options: {
        drawerLabel: 'Órdenes',
        drawerIcon: ({ color, size }) => <Icon name="list-alt" size={size} color={color} />
      }
    },
    {
      name: "AnularOrdenScreen",
      component: AnularOrdenScreen,
      options: {
        drawerLabel: 'Anular Órdenes',
        drawerIcon: ({ color, size }) => <Icon name="times-circle" size={size} color={color} />
      }
    },
    {
      name: "ResultadoExamenes",
      component: ResultadoExamenesScreen,
      options: {
        drawerLabel: 'Imprimir Resultados',
        drawerIcon: ({ color, size }) => <Icon name="print" size={size} color={color} />
      }
    },
    {
      name: "HistorialClinico",
      component: HistorialClinicoScreen,
      options: {
        drawerLabel: 'Historial Clínico',
        drawerIcon: ({ color, size }) => <Icon name="history" size={size} color={color} />
      }
    }
  ];

  // Pantallas exclusivas para EMPLEADO
  const employeeScreens = [
    {
      name: "Resultado",
      component: ResultadoScreen,
      options: {
        drawerLabel: 'Realizar Resultados',
        drawerIcon: ({ color, size }) => <Icon name="clipboard" size={size} color={color} />
      }
    },
    {
      name: "UpdateResultado",
      component: UpdateResultado,
      options: {
        drawerLabel: 'Actualizar Resultados',
        drawerIcon: ({ color, size }) => <Icon name="edit" size={size} color={color} />
      }
    },
    {
      name: "Factura",
      component: FacturaScreen,
      options: {
        drawerLabel: 'Facturas',
        drawerIcon: ({ color, size }) => <Icon name="file-text" size={size} color={color} />
      }
    },
    {
      name: "Orden",
      component: OrdenScreen,
      options: {
        drawerLabel: 'Órdenes',
        drawerIcon: ({ color, size }) => <Icon name="list-alt" size={size} color={color} />
      }
    },
    {
      name: "AnularOrdenScreen",
      component: AnularOrdenScreen,
      options: {
        drawerLabel: 'Anular Órdenes',
        drawerIcon: ({ color, size }) => <Icon name="times-circle" size={size} color={color} />
      }
    },
    {
      name: "ResultadoExamenes",
      component: ResultadoExamenesScreen,
      options: {
        drawerLabel: 'Imprimir Resultados',
        drawerIcon: ({ color, size }) => <Icon name="print" size={size} color={color} />
      }
    },
    {
      name: "HistorialClinico",
      component: HistorialClinicoScreen,
      options: {
        drawerLabel: 'Historial Clínico',
        drawerIcon: ({ color, size }) => <Icon name="history" size={size} color={color} />
      }
    }
  ];

  // Pantalla de cierre de sesión
  const logoutScreen = {
    name: "CerrarSesion",
    component: () => null,
    options: {
      drawerLabel: `Cerrar Sesión (${userData?.nombre || ''})`,
      drawerIcon: ({ color, size }) => <Icon name="sign-out" size={size} color={color} />
    },
    listeners: {
      focus: () => {
        handleLogout();
        Toast.show({
          type: 'success',
          text1: '✅ Sesión cerrada',
          text2: 'Has salido correctamente.',
        });
      }
    }
  };

  // Determinar qué pantallas mostrar según el rol
  const screensToShow = [...commonScreens];

  if (userData?.rol === 'ADMIN') {
    screensToShow.push(...adminScreens);
  } else {
    screensToShow.push(...employeeScreens);
  }

  screensToShow.push(logoutScreen);

  return (
    <Drawer.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerLeft: () => <DrawerToggleButton tintColor="#000" />,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerActiveTintColor: '#6200ee',
        drawerInactiveTintColor: '#333',
        drawerStyle: {
          backgroundColor: '#f5f5f5',
        }
      })}
    >
      {screensToShow.map((screen, index) => (
        <Drawer.Screen
          key={index}
          name={screen.name}
          component={screen.component}
          initialParams={{ userData }}
          options={screen.options}
          listeners={screen.listeners}
        />
      ))}
    </Drawer.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
const [isLoading, setIsLoading] = useState(true);
 // Verificar autenticación al iniciar
// No verificar autenticación al iniciar, siempre comenzar sin autenticar
useEffect(() => {
  setIsLoading(false);
}, []);

const handleLoginSuccess = async (data) => {
  try {
    // NO guardar nada en AsyncStorage, solo establecer el estado
    setUserData(data);
    setIsAuthenticated(true);
  } catch (error) {
    console.error("Error en login:", error);
  }
};

const handleLogout = async () => {
  try {
    // No hay nada que eliminar del almacenamiento
    setIsAuthenticated(false);
    setUserData(null);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
};

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  

  return (
    <PaperProvider theme={theme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer    fallback={<ActivityIndicator />}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
              <>
                <Stack.Screen name="LoginScreen">
                  {(props) => (
                    <LoginScreen
                      {...props}
                      onLoginSuccess={handleLoginSuccess}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen
                  name="Restablecer"
                  component={RestablecerScreen}
                />
              </>
            ) : (
              <>
                <Stack.Screen name="Main">
                  {(props) => (
                    <MainDrawerNavigator
                      {...props}
                      route={{
                        ...props.route,
                        params: { userData, handleLogout }
                      }}
                    />
                  )}
                </Stack.Screen>

                {/* Pantallas accesibles para todos */}
                <Stack.Screen
                  name="ResultadoExamenes"
                  component={ResultadoExamenesScreen}
                  initialParams={{ userData }}
                />
                <Stack.Screen
                  name="HistorialClinico"
                  component={HistorialClinicoScreen}
                  initialParams={{ userData }}
                />
                <Stack.Screen
                  name="UpdateResultado"
                  component={UpdateResultado}
                  initialParams={{ userData }}
                />

                {/* Pantallas protegidas - solo ADMIN */}
                {userData?.rol === 'ADMIN' && (
                  <>
                    <Stack.Screen
                      name="CrearCliente"
                      component={CrearClientesScreend}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Crear Cliente',
                        headerShown: true,
                        headerTitleStyle: {
                          fontWeight: 'bold',
                        },
                        headerStyle: {
                          backgroundColor: '#f5f5f5',
                        },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.getParent()?.openDrawer()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="menu" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />

                    <Stack.Screen
                      name="EditarClienteScreen"
                      component={EditarClienteScreen}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Editar Cliente',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="CrearMuestraScreen"
                      component={CrearMuestraScreen}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Nueva Muestra',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="EditarMuestraScreend"
                      component={EditarMuestraScreend}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Editar Muestra',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="CreateParametroScreen"
                      component={CreateParametroScreen}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Nuevo Parámetro',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="EditParametroScreen"
                      component={EditParametroScreen}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Editar Parámetro',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="CrearTipoExamenScreend"
                      component={CrearTipoExamenScreend}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Nuevo Tipo Examen',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="EditarTipoExamenScreen"
                      component={EditarTipoExamenScreen}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Editar Tipo Examen',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="CrearMedicoScreen"
                      component={CrearMedicoScreen}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Nuevo Médico',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="EditarMedicoScreen"
                      component={EditarMedicoScreen}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Editar Médico',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="ReporteGananciasScreen"
                      component={ReporteGananciasScreen}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Reporte de Ganancias',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="ReporteGananciasExamenScreen"
                      component={GananciasExamenScreen}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Reporte de Ganancias por Examen',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="ReporteTopMedicosScreen"
                      component={TopMedicosScreen}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Reporte de Médicos',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="ReporteExamenesMasSolicitadosScreen"
                      component={ExamenesMasSolicitadosScreen}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Exámenes Más Solicitados',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="ReportePacientesScreen"
                      component={PacientesRegistradosScreen}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Pacientes Registrados',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="ReportePacientesMasExamenesScreen"
                      component={ReportePacientesMasExamenesScreen}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Pacientes con Más Exámenes',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                    <Stack.Screen
                      name="ReportePagosPendientesScreen"
                      component={PagosPendientesScreen}
                      initialParams={{ userData }}
                      options={({ navigation }) => ({
                        title: 'Pagos Pendientes',
                        headerShown: true,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerStyle: { backgroundColor: '#f5f5f5' },
                        headerTintColor: '#000',
                        headerLeft: () => (
                          <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{ marginLeft: 15 }}
                          >
                            <Ionicons name="arrow-back" size={24} color="#000" />
                          </TouchableOpacity>
                        ),
                      })}
                    />
                  </>
                )}
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
        <Toast config={toastConfig} />
      </GestureHandlerRootView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});