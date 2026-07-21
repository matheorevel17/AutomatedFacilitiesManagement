# StageBali Sensor Simulator

Small external simulator that sends JSON sensor readings to the main StageBali backend.

The simulator is intentionally separated from `backend/` and `frontend/` so it can later be moved into its own Git repository.

## Setup

```bash
cd simulator
cp .env.example .env
```

Edit `.env` with the target backend URL and tool parameters.

Local backend example:

```env
API_URL=http://localhost:8000/api/cloud/sensor-readings
CLOUD_INGESTION_TOKEN=
TOOL_ID=4
UNIT=bar
MEAN=3.5
STANDARD_DEVIATION=0.1
NORMAL_MIN=2.5
NORMAL_MAX=4.5
SCENARIO=normal_operation
```

Railway backend example:

```env
API_URL=https://backend-production-ecab.up.railway.app/api/cloud/sensor-readings
CLOUD_INGESTION_TOKEN=your_backend_cloud_token
```

## Send One Batch

```bash
npm start
```

This sends `COUNT` readings in one JSON request:

```json
{
  "readings": [
    {
      "tool_id": 4,
      "recorded_at": "2026-07-16T10:00:00.000Z",
      "value": 3.2,
      "unit": "bar"
    }
  ]
}
```

## Continuous Mode

```bash
npm run start:continuous
```

This sends one reading every `INTERVAL_MS` milliseconds until you stop the process with `Ctrl+C`.

## Scenarios

Supported scenarios:

- `normal_operation`
- `possible_water_leak`
- `low_water_level`
- `water_pollution_detected`
- `poor_cooling_performance`
- `high_humidity_level`
- `poor_air_quality`
- `abnormal_sensor_values`

The backend receives the JSON values, stores them in `sensor_data`, and classifies each reading as `normal`, `warning`, or `critical`.

## Web Interface

You can also run a small simulator interface outside the main app:

```bash
npm run ui
```

Then open:

```txt
http://localhost:5174
```

This interface generates the same JSON readings as the CLI and sends them to the configured `API_URL`.

For local testing:

```txt
API URL: http://localhost:8000/api/cloud/sensor-readings
Tool ID: 4
Unit: bar
```

For Railway testing:

```txt
API URL: https://backend-production-ecab.up.railway.app/api/cloud/sensor-readings
Cloud token: your_backend_cloud_token
```
