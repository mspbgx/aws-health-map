// Alle kommerziellen AWS-Regionen mit ungefaehren Koordinaten (lon/lat)
// des jeweiligen Standorts. `code` wird zum Matchen mit den Health-Events
// genutzt (das AWS-`service`-Feld endet i.d.R. auf den Region-Code, z.B.
// "ec2-us-east-1"). China- und GovCloud-Regionen laufen ueber eigene
// Dashboards und sind hier bewusst nicht enthalten.

export const REGIONS = [
  { code: "us-east-1", name: "N. Virginia", lon: -77.46, lat: 38.95 },
  { code: "us-east-2", name: "Ohio", lon: -82.99, lat: 39.96 },
  { code: "us-west-1", name: "N. California", lon: -121.96, lat: 37.35 },
  { code: "us-west-2", name: "Oregon", lon: -122.68, lat: 45.52 },
  { code: "af-south-1", name: "Cape Town", lon: 18.42, lat: -33.92 },
  { code: "ap-east-1", name: "Hong Kong", lon: 114.17, lat: 22.32 },
  { code: "ap-south-1", name: "Mumbai", lon: 72.87, lat: 19.08 },
  { code: "ap-south-2", name: "Hyderabad", lon: 78.49, lat: 17.39 },
  { code: "ap-northeast-1", name: "Tokyo", lon: 139.69, lat: 35.69 },
  { code: "ap-northeast-2", name: "Seoul", lon: 126.98, lat: 37.57 },
  { code: "ap-northeast-3", name: "Osaka", lon: 135.5, lat: 34.69 },
  { code: "ap-southeast-1", name: "Singapore", lon: 103.82, lat: 1.35 },
  { code: "ap-southeast-2", name: "Sydney", lon: 151.21, lat: -33.87 },
  { code: "ap-southeast-3", name: "Jakarta", lon: 106.85, lat: -6.21 },
  { code: "ap-southeast-4", name: "Melbourne", lon: 144.96, lat: -37.81 },
  { code: "ap-southeast-5", name: "Malaysia", lon: 101.69, lat: 3.14 },
  { code: "ap-southeast-7", name: "Thailand", lon: 100.5, lat: 13.76 },
  { code: "ca-central-1", name: "Canada Central", lon: -73.57, lat: 45.5 },
  { code: "ca-west-1", name: "Calgary", lon: -114.07, lat: 51.05 },
  { code: "eu-central-1", name: "Frankfurt", lon: 8.68, lat: 50.11 },
  { code: "eu-central-2", name: "Zurich", lon: 8.54, lat: 47.37 },
  { code: "eu-west-1", name: "Ireland", lon: -6.26, lat: 53.35 },
  { code: "eu-west-2", name: "London", lon: -0.13, lat: 51.51 },
  { code: "eu-west-3", name: "Paris", lon: 2.35, lat: 48.86 },
  { code: "eu-south-1", name: "Milan", lon: 9.19, lat: 45.46 },
  { code: "eu-south-2", name: "Spain", lon: -0.88, lat: 41.65 },
  { code: "eu-north-1", name: "Stockholm", lon: 18.07, lat: 59.33 },
  { code: "il-central-1", name: "Tel Aviv", lon: 34.78, lat: 32.08 },
  { code: "me-south-1", name: "Bahrain", lon: 50.59, lat: 26.07 },
  { code: "me-central-1", name: "UAE", lon: 54.38, lat: 24.45 },
  { code: "mx-central-1", name: "Mexico", lon: -100.39, lat: 20.59 },
  { code: "sa-east-1", name: "Sao Paulo", lon: -46.63, lat: -23.55 },
];
