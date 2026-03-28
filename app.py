from flask import Flask, request, jsonify
from flask_cors import CORS
import ee

ee.Initialize(project='spacehack-491617')

app = Flask(__name__)
CORS(app)

@app.route("/glacier")
def glacier():

    year1 = int(request.args.get("year1"))
    year2 = int(request.args.get("year2"))

    alps = ee.Geometry.Rectangle([5, 44, 15, 48])

    def get_snow(year):
        return (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(alps)
            .filterDate(f"{year}-01-01", f"{year}-12-31")
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
            .median()
            .normalizedDifference(["B3", "B11"])
        )

    before = get_snow(year1)
    after = get_snow(year2)

    diff = after.subtract(before)

    map_id = diff.getMapId({
        "min": -0.4,
        "max": 0.4,
        "palette": ["blue", "white", "red"]
    })

    tile_url = map_id["tile_fetcher"].url_format

    return jsonify({
        "tile_url": tile_url
    })

if __name__ == "__main__":
    app.run(debug=True)