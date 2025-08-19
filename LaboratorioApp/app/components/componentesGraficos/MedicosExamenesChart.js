import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { ScrollView } from 'react-native-gesture-handler';

const MedicosExamenesChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartWidth, setChartWidth] = useState(Dimensions.get('window').width);

  // Configuración responsive
  useEffect(() => {
    const updateDimensions = () => {
      const { width } = Dimensions.get('window');
      // En web usamos el 100% del ancho disponible
      const newWidth = Platform.OS === 'web' ? 
        width : 
        width - 32;
      setChartWidth(newWidth);
    };

    updateDimensions();
    const subscription = Dimensions.addEventListener('change', updateDimensions);
    
    return () => subscription?.remove();
  }, []);

  // Obtener datos (mantenemos igual)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseURL = Platform.OS === 'android' 
          ? 'http://10.0.2.2:5090' 
          : 'http://localhost:5090';
        
        const response = await fetch(`${baseURL}/api/Graficos/MedicosConMasExamenes`);
        
        if (!response.ok) throw new Error(`Error: ${response.status}`);

        const result = await response.json();
        
        if (!result.$values || !Array.isArray(result.$values)) {
          throw new Error('Formato de datos incorrecto');
        }

        const medicosConExamenes = result.$values
          .filter(medico => medico.cantidadExamenes > 0)
          .sort((a, b) => b.cantidadExamenes - a.cantidadExamenes);

        if (medicosConExamenes.length === 0) {
          setError('No hay médicos con exámenes asignados');
          return;
        }

        const formatNombre = (nombre) => {
          const partes = nombre.split(/(?=[A-Z])/);
          const iniciales = partes.map(p => p[0]).join('');
          const nombreCorto = partes.length > 0 ? partes[0].substring(0, 2) : '';
          return `${iniciales}${nombreCorto}`.substring(0, 6);
        };

        setChartData({
          labels: medicosConExamenes.map(m => formatNombre(m.nombreMedico)),
          datasets: [{
            data: medicosConExamenes.map(m => m.cantidadExamenes),
            colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
              .map((color, i) => (opacity = 1) => i < medicosConExamenes.length ? color : '#000')
          }]
        });

      } catch (err) {
        console.error("Error:", err);
        setError("No se pudo cargar el gráfico");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} />;
  if (!chartData) return <NoDataView />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Médicos con más exámenes asignados</Text>
      
      {Platform.OS === 'web' ? (
        // Versión web - gráfico a ancho completo
        <View style={styles.webWrapper}>
          <BarChart
            data={chartData}
            width={chartWidth}
            height={400}
            chartConfig={webChartConfig}
            style={styles.webChart}
            fromZero
            showBarTops
            withHorizontalLabels={true}
            verticalLabelRotation={-45}
          />
        </View>
      ) : (
        // Versión móvil
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileScrollContent}
        >
          <BarChart
            data={chartData}
            width={Math.max(chartWidth, chartData.labels.length * 70)}
            height={300}
            chartConfig={mobileChartConfig}
            style={styles.mobileChart}
            fromZero
            showBarTops
          />
        </ScrollView>
      )}
    </View>
  );
};

// Componentes auxiliares (mantenemos igual)
const LoadingView = () => (
  <View style={[styles.container, styles.centerContent]}>
    <ActivityIndicator size="large" color="#3F51B5" />
  </View>
);

const ErrorView = ({ message }) => (
  <View style={[styles.container, styles.errorContainer]}>
    <Text style={styles.errorText}>{message}</Text>
  </View>
);

const NoDataView = () => (
  <View style={[styles.container, styles.centerContent]}>
    <Text style={styles.noDataText}>No hay datos disponibles</Text>
  </View>
);

// Configuraciones separadas para web y móvil
const webChartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(63, 81, 181, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: { borderRadius: 16 },
  barPercentage: 0.9, // Barras más anchas en web
  propsForLabels: {
    fontSize: 12,
    dx: -10
  },
  propsForVerticalLabels: {
    fontSize: 10,
    rotation: -45,
    dy: 20,
    dx: -5
  }
};

const mobileChartConfig = {
  ...webChartConfig,
  barPercentage: 0.5,
  propsForLabels: {
    fontSize: 10,
    dx: -10
  }
};

// Estilos actualizados
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    margin: Platform.OS === 'web' ? 0 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    width: Platform.OS === 'web' ? '100%' : 'auto',
    alignSelf: 'stretch'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#c62828',
    fontSize: 16
  },
  noDataText: {
    color: '#666',
    fontSize: 16
  },
  mobileScrollContent: {
    paddingRight: 16
  },
  webWrapper: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16
  },
  webChart: {
    marginVertical: 8,
    borderRadius: 16,
    width: '100%'
  },
  mobileChart: {
    marginVertical: 8,
    borderRadius: 16
  }
});

export default MedicosExamenesChart;