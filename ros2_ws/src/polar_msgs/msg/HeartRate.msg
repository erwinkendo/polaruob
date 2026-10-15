# One Heart Rate Measurement notification (BLE characteristic 0x2A37)
# from a Polar H7 or any standard BLE heart-rate strap.

std_msgs/Header header       # stamp: host receive time; frame_id: POLAR_FRAME_ID

string sensor_id             # strap MAC address, e.g. "00:22:D0:B9:8A:CB"

uint16 heart_rate            # beats per minute

# RR intervals in this notification, in seconds, oldest first.
# Empty when the strap sent none; it can hold more than one value.
float32[] rr_intervals

int8 CONTACT_NOT_SUPPORTED = -1
int8 CONTACT_LOST = 0
int8 CONTACT_OK = 1
int8 sensor_contact

int32 energy_expended        # kJ since last reset; -1 if not present
