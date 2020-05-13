async function fetchweapon(municipality) {
  var baseurl = "./weapons/";
  var fn = baseurl + municipality.toLowerCase() + ".png";
  return await fetch(fn).then((res) => res.blob()).then((blob => blob.arrayBuffer()));
}