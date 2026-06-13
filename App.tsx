import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppleHealthKit, { HealthKitPermissions } from 'react-native-health';

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [AppleHealthKit.Constants.Permissions.StepCount],
    write: [AppleHealthKit.Constants.Permissions.StepCount],
  },
};

// 距離換算步數（平均 1 公里約 1320 步）
const KM_TO_STEPS = 1320;

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // 手動輸入模式
  const [manualSteps, setManualSteps] = useState('3000');
  const [manualHours, setManualHours] = useState('1');

  // 距離換算模式
  const [distanceKm, setDistanceKm] = useState('');
  const [distanceHours, setDistanceHours] = useState('1');

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleHealthKit.initHealthKit(PERMISSIONS, (err) => {
      if (err) {
        Alert.alert('HealthKit 無法存取', String(err));
        return;
      }
      setInitialized(true);
      fetchTodaySteps();
    });
  }, []);

  const fetchTodaySteps = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    AppleHealthKit.getStepCount({ date: start.toISOString() }, (err, result) => {
      if (!err && result) setTodaySteps(result.value);
    });
  };

  const writeSteps = (steps: number, hours: number) => {
    if (steps <= 0 || hours <= 0) {
      Alert.alert('格式錯誤', '步數和時間必須大於 0');
      return;
    }
    setLoading(true);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - hours * 3600 * 1000);
    AppleHealthKit.saveSteps(
      { value: steps, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      (err) => {
        setLoading(false);
        if (err) {
          Alert.alert('寫入失敗', String(err));
          return;
        }
        Alert.alert('成功 ✓', `已寫入 ${steps.toLocaleString()} 步到 Apple Health`);
        fetchTodaySteps();
      }
    );
  };

  const handleManualWrite = () => {
    const steps = parseInt(manualSteps, 10);
    const hours = parseFloat(manualHours);
    if (isNaN(steps) || isNaN(hours)) {
      Alert.alert('格式錯誤', '請輸入有效數字');
      return;
    }
    writeSteps(steps, hours);
  };

  const handleDistanceWrite = () => {
    const km = parseFloat(distanceKm);
    const hours = parseFloat(distanceHours);
    if (isNaN(km) || isNaN(hours) || km <= 0) {
      Alert.alert('格式錯誤', '請輸入有效的公里數');
      return;
    }
    const steps = Math.round(km * KM_TO_STEPS);
    Alert.alert(
      '確認寫入',
      `${km} 公里 ≈ ${steps.toLocaleString()} 步\n時間範圍：過去 ${hours} 小時\n\n確定寫入？`,
      [
        { text: '取消', style: 'cancel' },
        { text: '確定', onPress: () => writeSteps(steps, hours) },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="dark" />

      <Text style={styles.title}>步數寫入工具</Text>
      <Text style={styles.desc}>配合 GPS 模擬工具使用</Text>

      {/* 今日步數 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>今日 Apple Health 步數</Text>
        <Text style={styles.stepsCount}>
          {todaySteps === null ? '讀取中…' : todaySteps.toLocaleString()}
        </Text>
        <TouchableOpacity onPress={fetchTodaySteps} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>重新整理</Text>
        </TouchableOpacity>
      </View>

      {!initialized && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>等待 HealthKit 授權…請確認已允許存取健康資料</Text>
        </View>
      )}

      {/* 模式一：直接輸入步數 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>直接輸入步數</Text>

        <Text style={styles.label}>步數</Text>
        <TextInput
          style={styles.input}
          value={manualSteps}
          onChangeText={setManualSteps}
          keyboardType="number-pad"
          placeholder="例：3000"
        />

        <Text style={styles.label}>時間範圍（小時，從現在往回算）</Text>
        <TextInput
          style={styles.input}
          value={manualHours}
          onChangeText={setManualHours}
          keyboardType="decimal-pad"
          placeholder="例：1"
        />

        <TouchableOpacity
          style={[styles.button, (!initialized || loading) && styles.buttonDisabled]}
          onPress={handleManualWrite}
          disabled={!initialized || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>寫入 Apple Health</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 模式二：用距離換算 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>用 GPS 距離換算步數</Text>
        <Text style={styles.hint}>
          每公里約 {KM_TO_STEPS.toLocaleString()} 步（慢走平均值）
        </Text>

        <Text style={styles.label}>移動距離（公里）</Text>
        <TextInput
          style={styles.input}
          value={distanceKm}
          onChangeText={setDistanceKm}
          keyboardType="decimal-pad"
          placeholder="例：3.5"
        />

        <Text style={styles.label}>時間範圍（小時，從現在往回算）</Text>
        <TextInput
          style={styles.input}
          value={distanceHours}
          onChangeText={setDistanceHours}
          keyboardType="decimal-pad"
          placeholder="例：1"
        />

        {distanceKm !== '' && !isNaN(parseFloat(distanceKm)) && (
          <Text style={styles.preview}>
            ≈ {Math.round(parseFloat(distanceKm) * KM_TO_STEPS).toLocaleString()} 步
          </Text>
        )}

        <TouchableOpacity
          style={[styles.button, styles.buttonGreen, (!initialized || loading) && styles.buttonDisabled]}
          onPress={handleDistanceWrite}
          disabled={!initialized || loading}
        >
          <Text style={styles.buttonText}>換算並寫入</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#f2f2f7',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  desc: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  stepsCount: {
    fontSize: 42,
    fontWeight: '700',
    color: '#007AFF',
    marginVertical: 4,
  },
  refreshBtn: {
    marginTop: 8,
  },
  refreshText: {
    color: '#007AFF',
    fontSize: 14,
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    color: '#555',
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  hint: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 4,
  },
  preview: {
    fontSize: 20,
    fontWeight: '600',
    color: '#34C759',
    marginTop: 10,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonGreen: {
    backgroundColor: '#34C759',
  },
  buttonDisabled: {
    backgroundColor: '#c7c7cc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
