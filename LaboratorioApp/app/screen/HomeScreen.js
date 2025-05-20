
import React from 'react';
import { View, Text } from 'react-native';
import OrdenesPendientesCard from '../components/componentesGraficos/OrdenesPendientesCard';
import TotalMedicosCard from '../components/componentesGraficos/TotalMedicosCard';
import TotalClientesCard from '../components/componentesGraficos/TotalClientesCard';
import TotalGanadoAnualCard from '../components/componentesGraficos/TotalGanadoAnualCard';
import MedicosExamenesChart from '../components/componentesGraficos/MedicosExamenesChart';
import DemografiaClientesChart from '../components/componentesGraficos/DemografiaClientesChart';
import GananciasMensualesChart from '../components/componentesGraficos/GananciasMensualesChart';
import OrdenesPorEstadoChart from '../components/componentesGraficos/OrdenesPorEstadoChart';
import { ScrollView } from 'react-native-gesture-handler';
import PacientesFrecuentes from '../components/componentesGraficos/PacientesFrecuentes';
import IngresosPorExamen from '../components/componentesGraficos/IngresosPorExamen';
import ExamenesRecientes from '../components/componentesGraficos/ExamenesRecientes';
import CardWarnind from '../components/componentesGraficos/CardWarnind';
import HeatmapChart from '../components/componentesGraficos/HeatmapChart';
import { id } from 'react-native-paper-dates';
import withAutoRefresh from './withAutoRefresh';
import DashboardCardsRow from '../components/componentesGraficos/DashboardCardsRow';
function HomeScreen({route}) {
  const { userData } = route.params;
  
  // Componentes que contienen FlatList (necesitan altura fija y scroll deshabilitado)
  const orderedComponents = [
   { id: 'mapa', component: <HeatmapChart />, height: 400, hasFlatList: false },
  { id: 'cardWarning', component: <CardWarnind />,  hasFlatList: true },
  { id: 'dashboardCardsRow', component: <DashboardCardsRow />, hasFlatList: false },
  { id: 'medicosExamenes', component: <MedicosExamenesChart />, hasFlatList: false },
  { id: 'demografiaClientes', component: <DemografiaClientesChart />, hasFlatList: false },
  { id: 'gananciasMensuales', component: <GananciasMensualesChart />, hasFlatList: false },
  { id: 'ordenesPorEstado', component: <OrdenesPorEstadoChart />, hasFlatList: false },
  { id: 'ingresosPorExamen', component: <IngresosPorExamen />, hasFlatList: false },
  { id: 'pacientesFrecuentes', component: <PacientesFrecuentes />, height: 400, hasFlatList: true },
];


  return (
   <ScrollView  contentContainerStyle={{ padding: 12 }}
  style={{ backgroundColor: '#2c3e50', flex: 1 }}
  showsVerticalScrollIndicator={false}>
  {orderedComponents.map(item => (
    <View key={item.id} style={{ marginBottom: 20, ...(item.hasFlatList && { height: item.height }) }}>
      {item.hasFlatList
        ? React.cloneElement(item.component, { scrollEnabled: false })
        : item.component}
    </View>
  ))}
</ScrollView>

  );
}

export default withAutoRefresh(HomeScreen);
