import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Platform } from 'react-native';
const ExamenesMasSolicitadosChart = () => {
  const [data, setData] = useState([]);
 const baseURL = Platform.OS === 'android' 
          ? 'http://10.0.2.2:5090' 
          : 'http://localhost:5090';
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${baseURL}/api/Graficos/ExamenesMasSolicitados`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  if (data.length === 0) return <Text>Cargando datos...</Text>;

  const chartData = data.map(item => ({
    name: item.nombreExamen,
    population: item.cantidad,
    color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
    legendFontColor: '#7F7F7F',
    legendFontSize: 12
  }));

  return (
    <View style={{ alignItems: 'center', marginVertical: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Exámenes Más Solicitados
      </Text>
      <PieChart
        data={chartData}
        width={Dimensions.get('window').width - 30}
        height={200}
        chartConfig={{
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
        style={{ borderRadius: 16 }}
      />
    </View>
  );
};

export default ExamenesMasSolicitadosChart;