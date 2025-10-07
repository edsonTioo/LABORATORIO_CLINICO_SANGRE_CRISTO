import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CardWarning = ({ scrollEnabled = true }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) throw new Error("No se encontró token, inicia sesión");
  
        const baseURL =
          Platform.OS === "android"
            ? "http://10.0.2.2:5090/api/Ordenes/ordenes-con-detalles"
            : "http://localhost:5090/api/Ordenes/ordenes-con-detalles";
  
        const response = await fetch(baseURL, {
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`, // <-- token agregado
          },
        });
  
        if (!response.ok) throw new Error(`Error ${response.status} al cargar las órdenes`);
  
        const data = await response.json();
  
        // Filtrar FACTURADAS
        const filteredOrders = data.$values.filter(
          (order) => order.estado === "FACTURADO"
        );
  
        // Ordenar por fecha más cercana
        const sortedOrders = filteredOrders.sort(
          (a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega)
        );
  
        setOrders(sortedOrders);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
  
    fetchOrders();
  }, []);

  const renderOrderCard = ({ item }) => {
    const deliveryDate = new Date(item.fechaEntrega);
    const today = new Date();
    const oneDay = 1000 * 60 * 60 * 24;
    const diffTime =
      deliveryDate.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
    const daysLeft = Math.floor(diffTime / oneDay);

    let diasTexto = "";
    if (daysLeft === 0) {
      diasTexto = "Hoy";
    } else if (daysLeft < 0) {
      diasTexto = `Hace ${Math.abs(daysLeft)} día${
        Math.abs(daysLeft) !== 1 ? "s" : ""
      }`;
    } else {
      diasTexto = `Faltan ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`;
    }
    const isUrgent = daysLeft <= 3;

    return (
      <View style={styles.card}>
        {/* Encabezado */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Icon name="flask-outline" size={20} color="#2980b9" />
            <Text style={styles.orderNumber}> Orden #{item.idOrden}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isUrgent ? styles.urgentBadge : styles.pendingBadge,
            ]}
          >
            <Icon
              name={isUrgent ? "alert-circle" : "clock-time-four"}
              size={14}
              color="#fff"
            />
            <Text style={styles.statusText}>
              {isUrgent ? "URGENTE" : "PENDIENTE"}
            </Text>
          </View>
        </View>

        {/* Cliente y médico */}
        <View style={styles.row}>
          <Icon name="account-circle" size={18} color="#7f8c8d" />
          <Text style={styles.clientName}> Cliente: {item.clienteId}</Text>
        </View>

        <View style={styles.row}>
          <Icon name="stethoscope" size={18} color="#7f8c8d" />
          <Text style={styles.doctorName}> Médico: {item.medicoId}</Text>
        </View>

        {/* Exámenes */}
        <Text style={styles.sectionTitle}>🧾 Exámenes:</Text>
        {item.detalles.$values.map((exam, index) => (
          <View key={`${item.idOrden}-${index}`} style={styles.examRow}>
            <Icon
              name="test-tube"
              size={16}
              color="#3498db"
              style={styles.examIcon}
            />
            <View>
              <Text style={styles.examName}>{exam.tipoExamen}</Text>
              <Text style={styles.examDetails}>
                Muestra: {exam.muestra}
              </Text>
            </View>
          </View>
        ))}

        {/* Entrega y días */}
        <View style={styles.deliveryInfo}>
          <View style={styles.row}>
            <Icon name="calendar-clock" size={18} color="#95a5a6" />
            <Text style={styles.deliveryText}>
              {" "}
              Entrega:{" "}
              {deliveryDate.toLocaleDateString("es-ES", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </Text>
          </View>
          <View style={styles.daysBadge}>
            <Icon
              name="calendar-alert"
              size={14}
              color={isUrgent ? "#e74c3c" : "#27ae60"}
            />
            <Text
              style={[
                styles.daysLeft,
                isUrgent ? styles.urgentText : styles.normalText,
              ]}
            >
              {diasTexto}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={orders} // ✔ Usa tu estado de órdenes
        renderItem={renderOrderCard} // ✔ Usa tu función definida arriba
        keyExtractor={(item) => item.idOrden.toString()}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="clipboard-check-outline" size={60} color="#bdc3c7" />
            <Text style={styles.emptyTitle}>¡Todo al día!</Text>
            <Text style={styles.emptyMessage}>
              No hay órdenes pendientes de entrega
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: "#3498db",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c3e50",
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 6,
  },
  urgentBadge: {
    backgroundColor: "#e74c3c",
  },
  pendingBadge: {
    backgroundColor: "#3498db",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  clientName: {
    fontSize: 15,
    color: "#34495e",
    marginLeft: 6,
  },
  doctorName: {
    fontSize: 14,
    color: "#7f8c8d",
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginTop: 10,
    marginBottom: 6,
  },
  examRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    marginLeft: 10,
  },
  examIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  examName: {
    fontSize: 14,
    color: "#34495e",
  },
  examDetails: {
    fontSize: 12,
    color: "#7f8c8d",
  },

  deliveryInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
    paddingTop: 10,
  },
  deliveryText: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  daysBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecf0f1",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  daysLeft: {
    fontSize: 13,
    fontWeight: "bold",
    marginLeft: 4,
  },
  urgentText: {
    color: "#e74c3c",
  },
  normalText: {
    color: "#27ae60",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#2c3e50",
    marginTop: 15,
    marginBottom: 5,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    lineHeight: 24,
  },
});

export default CardWarning;
