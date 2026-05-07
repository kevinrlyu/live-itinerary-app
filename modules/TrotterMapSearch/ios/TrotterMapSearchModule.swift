import ExpoModulesCore
import MapKit

public class TrotterMapSearchModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TrotterMapSearch")

    AsyncFunction("search") { (query: String, limit: Int, biasLat: Double?, biasLng: Double?) -> [[String: Any]] in
      let request = MKLocalSearch.Request()
      request.naturalLanguageQuery = query
      request.resultTypes = [.pointOfInterest, .address]

      if let lat = biasLat, let lng = biasLng {
        let center = CLLocationCoordinate2D(latitude: lat, longitude: lng)
        let span = MKCoordinateSpan(latitudeDelta: 1.0, longitudeDelta: 1.0)
        request.region = MKCoordinateRegion(center: center, span: span)
      }

      do {
        let search = MKLocalSearch(request: request)
        let response = try await search.start()
        let items = Array(response.mapItems.prefix(limit))

        return items.map { item in
          let name = item.name ?? query
          var addressParts: [String] = []
          if let thoroughfare = item.placemark.thoroughfare {
            if let subThoroughfare = item.placemark.subThoroughfare {
              addressParts.append("\(subThoroughfare) \(thoroughfare)")
            } else {
              addressParts.append(thoroughfare)
            }
          }
          if let locality = item.placemark.locality {
            addressParts.append(locality)
          }
          if let adminArea = item.placemark.administrativeArea {
            addressParts.append(adminArea)
          }
          if let country = item.placemark.country {
            addressParts.append(country)
          }

          return [
            "name": name,
            "address": addressParts.joined(separator: ", "),
            "latitude": item.placemark.coordinate.latitude,
            "longitude": item.placemark.coordinate.longitude,
          ]
        }
      } catch {
        NSLog("TrotterMapSearch: search failed: \(error.localizedDescription)")
        return []
      }
    }
  }
}
