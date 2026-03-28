from flask import Flask, request, jsonify
from flask_cors import CORS
import ee

credentials = ee.ServiceAccountCredentials(
    'mayra-955@spacehack-491617.iam.gserviceaccount.com',
    'key.json'
)
ee.Initialize(credentials, project='spacehack-491617')

app = Flask(__name__)
CORS(app)

@app.route("/glacier")
def glacier():
    year1 = request.args.get("year1")
    year2 = request.args.get("year2")

    if not year1 or not year2:
        return jsonify({"error": "year1 y year2 son requeridos"}), 400

    try:
        year1, year2 = int(year1), int(year2)
    except ValueError:
        return jsonify({"error": "year1 y year2 deben ser números"}), 400

    alps = ee.Geometry.Rectangle([5, 44, 15, 48])

    def get_snow(year):
        return (
            ee.ImageCollection("COPERNICUS/S2_HARMONIZED")  # ← corregido
            .filterBounds(alps)
            .filterDate(f"{year}-06-01", f"{year}-09-30")   # ← solo verano
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
            .median()
            .normalizedDifference(["B3", "B11"])
        )

    try:
        before = get_snow(year1)
        after = get_snow(year2)
        diff = after.subtract(before)

        # ← agregar máscara de umbral
        threshold = 0.05
        masked_diff = diff.updateMask(diff.abs().gt(threshold))

        map_id = masked_diff.getMapId({
            "min": -0.4,
            "max": 0.4,
            "palette": ["red", "white", "blue"]  # ← mismo orden que GEE
        })

        tile_url = map_id["tile_fetcher"].url_format
        return jsonify({"tile_url": tile_url})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)