import random
import time
import math

# Simulates streaming sensor or application data 
def generate_point():
    current_time_sec = time.time()
    
    # Normal behavior: feature_1 ~ sine wave, feature_2 ~ noise, feature_3 ~ constant + noise
    f1 = math.sin(current_time_sec / 10.0) * 10 
    f2 = random.gauss(0, 1)
    f3 = 50 + random.gauss(0, 0.5)

    # Inject anomaly probabilistically (e.g. 5% chance)
    if random.random() < 0.05:
        anomaly_type = random.choice([1, 2, 3])
        if anomaly_type == 1:
            f1 += random.uniform(20, 50)
        elif anomaly_type == 2:
            f2 += random.uniform(10, 20)
        else:
            f3 *= random.uniform(0.1, 0.5)
            
    return (float(f1), float(f2), float(f3))
