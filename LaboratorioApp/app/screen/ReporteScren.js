import React from 'react';
import { Text, Pressable, StyleSheet, ScrollView, View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;

const ReporteScreen = () => {
  const navigation = useNavigation();

  const reportes = [
    { title: 'Reporte de Ganancias', icon: 'cash-outline', route: 'ReporteGananciasScreen' },
    { title: 'Reporte de Ganancias por Examen', icon: 'bar-chart-outline', route: 'ReporteGananciasExamenScreen' },
    { title: 'Reporte de Top Médicos', icon: 'medkit-outline', route: 'ReporteTopMedicosScreen' },
    { title: 'Reporte de Exámenes Más Solicitados', icon: 'analytics-outline', route: 'ReporteExamenesMasSolicitadosScreen' },
    { title: 'Reporte de Pacientes Registrados', icon: 'people-outline', route: 'ReportePacientesScreen' },
    { title: 'Pacientes con Más Exámenes', icon: 'file-tray-full-outline', route: 'ReportePacientesMasExamenesScreen' },
    { title: 'Reporte de Pagos Pendientes', icon: 'card-outline', route: 'ReportePagosPendientesScreen' },
  ];

  return (
    <LinearGradient colors={['#dbeafe', '#eff6ff']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📊 Reportes del Sistema</Text>
        <View style={styles.grid}>
          {reportes.map((reporte, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: pressed ? '#2563eb' : '#3b82f6',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={() => navigation.navigate(reporte.route)}
            >
              <View style={styles.iconContainer}>
                <Ionicons name={reporte.icon} size={24} color="#1e3a8a" />
              </View>
              <Text style={styles.cardText}>{reporte.title}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#1f2937',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: (screenWidth - 60) / 2,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginBottom: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  iconContainer: {
    backgroundColor: '#bfdbfe',
    padding: 10,
    borderRadius: 999,
    marginRight: 8,
  },
  cardText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});

export default ReporteScreen;