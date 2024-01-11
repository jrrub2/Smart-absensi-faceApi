import { useEffect, useRef, useState } from "react";
import "./App.css";
import * as faceapi from "face-api.js";

const faces = [
  {
    nama: "IR Soekarno",
    NIM: "1",
    kelas: "LB08",
  },
  {
    nama: "Soeharto",
    NIM: "2",
    kelas: "LB08",
  },
  {
    nama: "Bacharuddin Jusuf Habibie",
    NIM: "3",
    kelas: "LC08",
  },
  {
    nama: "Abdurrahman Wahid",
    NIM: "4",
    kelas: "LC08",
  },
  {
    nama: "Megawati Soekarnoputri",
    NIM: "5",
    kelas: "LD08",
  },
  {
    nama: "Susilo Bambang Yudhoyono",
    NIM: "6",
    kelas: "LD08",
  },
  {
    nama: "Jokowi",
    NIM: "7",
    kelas: "LA08",
  },
  {
    nama: "Mohammad Hatta",
    NIM: "8",
    kelas: "LA08",
  },
  {
    nama: "Hamengkubuwono IX",
    NIM: "9",
    kelas: "LB08",
  },
  {
    nama: "Adam Malik",
    NIM: "10",
    kelas: "LB08",
  },
  {
    nama: "Umar Wirahadikusumah",
    NIM: "11",
    kelas: "LC08",
  },
  {
    nama: "Sudharmono",
    NIM: "12",
    kelas: "LC08",
  },
  {
    nama: "Try Sutrisno",
    NIM: "13",
    kelas: "LD08",
  },
  {
    nama: "Hamzah Haz",
    NIM: "14",
    kelas: "LD08",
  },
  {
    nama: "M. Jusuf Kalla",
    NIM: "15",
    kelas: "LA08",
  },
  {
    nama: "Boediono",
    NIM: "16",
    kelas: "LA08",
  },
  {
    nama: "Ma'ruf Amin",
    NIM: "17",
    kelas: "LB08",
  },
];

function App() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [captureVideo, setCaptureVideo] = useState(false);
  const [labels, setLabels] = useState<faceapi.LabeledFaceDescriptors[]>([]);

  //absensi
  const [absensi, setAbsensi] = useState<
    ((typeof faces)[number] & {
      tanggal: string;
    })[]
  >([]);

  const videoRef = useRef();
  const videoHeight = 480;
  const videoWidth = 640;
  const canvasRef = useRef();

  const faceMatcher = labels.length
    ? new faceapi.FaceMatcher(labels, 0.6)
    : null;

  window.getAbsensi = () => {
    return absensi;
  };

  const generateCSV = () => {
    const csvRows = [];
    const headers = Object.keys(absensi[0]);
    csvRows.push(headers.join(","));

    for (const row of absensi) {
      const values = headers.map((header) => {
        const escaped = ("" + row[header]).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    }

    const csvString = csvRows.join("\n");
    const a = document.createElement("a");
    a.href = "data:attachment/csv," + csvString;
    a.target = "_Blank";
    a.download = "absensi.csv";
    document.body.appendChild(a);
    a.click();

    setAbsensi([]);
  };

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "models";

      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]).then(() => {
        faces.forEach((face) => {
          faceapi
            .fetchImage("faces/" + face.NIM + ".jpg")
            .then((img) => {
              faceapi
                .detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor()
                .then((detection) => {
                  if (detection) {
                    const labeledFaceDescriptors =
                      new faceapi.LabeledFaceDescriptors(face.NIM, [
                        detection.descriptor,
                      ]);
                    setLabels((prev) => [...prev, labeledFaceDescriptors]);
                    console.log("added face" + face.NIM);
                  }
                });
            })
            .catch((err) => console.error("error:", err));
        });
        setModelsLoaded(true);
      });

      //load photos
    };
    loadModels();
  }, []);

  const startVideo = () => {
    setCaptureVideo(true);
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        const video = videoRef.current;
        video.srcObject = stream;
        video.play();
      })
      .catch((err) => {
        console.error("error:", err);
      });
  };

  const handleVideoOnPlay = () => {
    setInterval(async () => {
      if (canvasRef && canvasRef.current) {
        canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(
          videoRef.current
        );
        const displaySize = {
          width: videoWidth,
          height: videoHeight,
        };

        faceapi.matchDimensions(canvasRef.current, displaySize);

        const detections = await faceapi
          .detectAllFaces(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptors();

        detections.forEach((detection) => {
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
          if (bestMatch.label === "unknown") return;

          // check in absensi

          setAbsensi((prev) => {
            // check if already exist
            const isExist = prev.find((item) => item.NIM === bestMatch.label);
            if (isExist) return prev;

            const faceData = faces.find((item) => item.NIM === bestMatch.label);
            return [
              ...prev,
              {
                ...faceData,
                tanggal: new Date().toLocaleString(),
              },
            ];
          });
        });

        const resizedDetections = faceapi.resizeResults(
          detections,
          displaySize
        );

        canvasRef &&
          canvasRef.current &&
          canvasRef.current
            .getContext("2d")
            .clearRect(0, 0, videoWidth, videoHeight);

        canvasRef &&
          canvasRef.current &&
          faceapi.draw.drawDetections(canvasRef.current, resizedDetections);

        canvasRef &&
          canvasRef.current &&
          faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
      }
    }, 100);
  };

  const closeWebcam = () => {
    videoRef.current.pause();
    videoRef.current.srcObject.getTracks()[0].stop();
    setCaptureVideo(false);
  };

  return (
    <>
      <div>
        <div style={{ textAlign: "center", padding: "10px" }}>
          {captureVideo && modelsLoaded ? (
            <button
              onClick={closeWebcam}
              style={{
                cursor: "pointer",
                backgroundColor: "green",
                color: "white",
                padding: "15px",
                fontSize: "25px",
                border: "none",
                borderRadius: "10px",
              }}
            >
              Close Webcam
            </button>
          ) : (
            <button
              onClick={startVideo}
              style={{
                cursor: "pointer",
                backgroundColor: "green",
                color: "white",
                padding: "15px",
                fontSize: "25px",
                border: "none",
                borderRadius: "10px",
              }}
            >
              Open Webcam
            </button>
          )}
        </div>
        {captureVideo ? (
          modelsLoaded ? (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "10px",
                }}
              >
                <video
                  ref={videoRef}
                  height={videoHeight}
                  width={videoWidth}
                  onPlay={handleVideoOnPlay}
                  style={{ borderRadius: "10px" }}
                />
                <canvas ref={canvasRef} style={{ position: "absolute" }} />
              </div>
              {/* table for all absensi */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "10px",
                }}
              >
                <table
                  style={{
                    borderCollapse: "collapse",
                    border: "1px solid black",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid black" }}>NIM</th>
                      <th style={{ border: "1px solid black" }}>Nama</th>
                      <th style={{ border: "1px solid black" }}>Kelas</th>
                      <th style={{ border: "1px solid black" }}>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absensi.map((item, index) => (
                      <tr key={index}>
                        <td style={{ border: "1px solid black" }}>
                          {item.NIM}
                        </td>
                        <td style={{ border: "1px solid black" }}>
                          {item.nama}
                        </td>
                        <td style={{ border: "1px solid black" }}>
                          {item.kelas}
                        </td>
                        <td style={{ border: "1px solid black" }}>
                          {item.tanggal}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>loading...</div>
          )
        ) : (
          <button
            onClick={generateCSV}
            style={{
              cursor: "pointer",
              backgroundColor: "skyblue",
              color: "black",
              padding: "10px",
              fontSize: "20px",
              border: "none",
              borderRadius: "10px",
            }}
          >
            Download CSV
          </button>
        )}
      </div>
    </>
  );
}

export default App;
