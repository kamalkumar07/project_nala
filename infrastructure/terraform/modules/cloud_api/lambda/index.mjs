export const handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      service: "nala-cloud-api",
      status: "ok",
      environment: "dev"
    })
  };
};
