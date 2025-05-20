import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

const DemografiaClientesChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartWidth, setChartWidth] = useState(Dimensions.get('window').width);

  const baseURL = Platform.OS === 'android' 
    ? 'http://10.0.2.2:5090' 
    : 'http://localhost:5090';

  // Configuración responsive para ocupar todo el ancho en web
  useEffect(() => {
    const updateDimensions = () => {
      const { width } = Dimensions.get('window');
      // En web usamos 98% del ancho, en móvil el ancho completo menos 32px
      const newWidth = Platform.OS === 'web' ? 
        width * 0.98 :  // 98% para dejar un pequeño margen
        width - 32;     // Móvil: ancho completo menos padding
      setChartWidth(newWidth);
    };

    updateDimensions();
    const subscription = Dimensions.addEventListener('change', updateDimensions);
    
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${baseURL}/api/Graficos/DemografiaClientes`);
        if (!response.ok) throw new Error(`Error: ${response.status}`);

        const result = await response.json();
        const filteredData = Object.fromEntries(
          Object.entries(result).filter(([key]) => key !== '$id')
        );

        if (Object.keys(filteredData).length === 0) {
          setError('No hay datos demográficos disponibles');
          return;
        }

        setChartData({
          labels: Object.keys(filteredData),
          datasets: [{
            data: Object.values(filteredData),
            colors: [
              (opacity = 1) => `rgba(255, 99, 132, ${opacity})`, // Rosa
              (opacity = 1) => `rgba(54, 162, 235, ${opacity})`    // Azul
            ]
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
      <Text style={styles.title}>Distribución de Clientes por Género</Text>
      
      {Platform.OS === 'web' ? (
        // Versión WEB - Full Width
        <View style={styles.webFullWidthContainer}>
          <BarChart
            data={chartData}
            width={chartWidth}
            height={400}
            chartConfig={webChartConfig}
            style={styles.webChart}
            fromZero
            showBarTops={false}
            withCustomBarColorFromData
            flatColor
            verticalLabelRotation={-45}
            withHorizontalLabels={true}
            withVerticalLabels={true}
          />
        </View>
      ) : (
        // Versión MÓVIL
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileScrollContent}
        >
          <BarChart
            data={chartData}
            width={Math.max(chartWidth, chartData.labels.length * 100)}
            height={250}
            chartConfig={mobileChartConfig}
            style={styles.mobileChart}
            fromZero
            showBarTops={false}
            withCustomBarColorFromData
            flatColor
            horizontal
          />
        </ScrollView>
      )}
    </View>
  );
};

// Componentes auxiliares
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
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: { borderRadius: 16 },
  barPercentage: 0.8, // Barras más anchas en web
  propsForLabels: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  propsForVerticalLabels: {
    fontSize: 12,
    rotation: -45,
    dy: 20,
    dx: -5
  }
};

const mobileChartConfig = {
  ...webChartConfig,
  barPercentage: 0.5,
  propsForLabels: {
    fontSize: 12,
    fontWeight: 'bold'
  }
};

// Estilos optimizados para full width en web
const styles = StyleSheet.create({
  container: {
    marginTop:15,
    backgroundColor: 'white',
    borderRadius: Platform.OS === 'web' ? 0 : 16,
    padding: 16,
    margin: Platform.OS === 'web' ? 0 : 8,
    shadowColor: Platform.OS === 'web' ? 'transparent' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'web' ? 0 : 0.1,
    shadowRadius: Platform.OS === 'web' ? 0 : 6,
    elevation: Platform.OS === 'web' ? 0 : 3,
    width: Platform.OS === 'web' ? '100%' : 'auto',
    alignSelf: 'stretch'
  },
  title: {
    fontSize: Platform.OS === 'web' ? 24 : 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  webFullWidthContainer: {
    width: '100%',
    overflow: 'hidden',
    marginVertical: 16
  },
  webChart: {
    marginVertical: 8,
    width: '100%'
  },
  mobileChart: {
    marginVertical: 8,
    borderRadius: 16
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
  }
});

export default DemografiaClientesChart;