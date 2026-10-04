import type { Place } from "./constants";

const IN = "Asia/Kolkata";
/** Offline city list (no geocoding service needed). Coordinates to ~1 km. */
export const PLACES: Place[] = [
  ["Mumbai", 19.076, 72.8777], ["New Delhi", 28.6139, 77.209], ["Bengaluru", 12.9716, 77.5946], ["Hyderabad", 17.385, 78.4867],
  ["Ahmedabad", 23.0225, 72.5714], ["Chennai", 13.0827, 80.2707], ["Kolkata", 22.5726, 88.3639], ["Pune", 18.5204, 73.8567],
  ["Jaipur", 26.9124, 75.7873], ["Lucknow", 26.8467, 80.9462], ["Kanpur", 26.4499, 80.3319], ["Nagpur", 21.1458, 79.0882],
  ["Indore", 22.7196, 75.8577], ["Bhopal", 23.2599, 77.4126], ["Patna", 25.5941, 85.1376], ["Vadodara", 22.3072, 73.1812],
  ["Surat", 21.1702, 72.8311], ["Ludhiana", 30.901, 75.8573], ["Agra", 27.1767, 78.0081], ["Nashik", 19.9975, 73.7898],
  ["Varanasi", 25.3176, 82.9739], ["Prayagraj", 25.4358, 81.8463], ["Chandigarh", 30.7333, 76.7794], ["Amritsar", 31.634, 74.8723],
  ["Dehradun", 30.3165, 78.0322], ["Shimla", 31.1048, 77.1734], ["Srinagar", 34.0837, 74.7973], ["Jammu", 32.7266, 74.857],
  ["Jodhpur", 26.2389, 73.0243], ["Udaipur", 24.5854, 73.7125], ["Gurugram", 28.4595, 77.0266], ["Noida", 28.5355, 77.391],
  ["Meerut", 28.9845, 77.7064], ["Gorakhpur", 26.7606, 83.3732], ["Ranchi", 23.3441, 85.3096], ["Raipur", 21.2514, 81.6296],
  ["Bhubaneswar", 20.2961, 85.8245], ["Guwahati", 26.1445, 91.7362], ["Visakhapatnam", 17.6868, 83.2185], ["Vijayawada", 16.5062, 80.648],
  ["Kochi", 9.9312, 76.2673], ["Thiruvananthapuram", 8.5241, 76.9366], ["Coimbatore", 11.0168, 76.9558], ["Madurai", 9.9252, 78.1198],
  ["Mysuru", 12.2958, 76.6394], ["Mangaluru", 12.9141, 74.856], ["Panaji (Goa)", 15.4909, 73.8278], ["Siliguri", 26.7271, 88.3953],
]
  .map(([name, lat, lon]) => ({ name: name as string, lat: lat as number, lon: lon as number, tz: IN }))
  .concat(
    (
      [
        ["Kathmandu", 27.7172, 85.324, "Asia/Kathmandu"], ["Dhaka", 23.8103, 90.4125, "Asia/Dhaka"], ["Colombo", 6.9271, 79.8612, "Asia/Colombo"],
        ["Dubai", 25.2048, 55.2708, "Asia/Dubai"], ["Doha", 25.2854, 51.531, "Asia/Qatar"], ["Riyadh", 24.7136, 46.6753, "Asia/Riyadh"],
        ["Singapore", 1.3521, 103.8198, "Asia/Singapore"], ["Kuala Lumpur", 3.139, 101.6869, "Asia/Kuala_Lumpur"], ["Tokyo", 35.6762, 139.6503, "Asia/Tokyo"],
        ["Sydney", -33.8688, 151.2093, "Australia/Sydney"], ["Melbourne", -37.8136, 144.9631, "Australia/Melbourne"], ["Auckland", -36.8485, 174.7633, "Pacific/Auckland"],
        ["London", 51.5074, -0.1278, "Europe/London"], ["Paris", 48.8566, 2.3522, "Europe/Paris"], ["Berlin", 52.52, 13.405, "Europe/Berlin"],
        ["New York", 40.7128, -74.006, "America/New_York"], ["Toronto", 43.6532, -79.3832, "America/Toronto"], ["Chicago", 41.8781, -87.6298, "America/Chicago"],
        ["San Francisco", 37.7749, -122.4194, "America/Los_Angeles"], ["Los Angeles", 34.0522, -118.2437, "America/Los_Angeles"], ["Johannesburg", -26.2041, 28.0473, "Africa/Johannesburg"],
      ] as const
    ).map(([name, lat, lon, tz]) => ({ name, lat, lon, tz })),
  );
