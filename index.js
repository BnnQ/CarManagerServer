const express = require("express");
const app = express();
const sql = require("mssql");
const { environment } = require("./environment");

async function main() {
  const pool = new sql.ConnectionPool(environment.databaseConfig);
  await pool.connect();

  const cors = require("cors");
  app.use(
    cors({
      origin: "http://localhost:4200",
    })
  );

  const bodyParser = require("body-parser");
  app.use(bodyParser.json());

  app.get("/cars", async (request, response) => {
    const id = request.query.id;

    try {
      if (id) {
        const queryResult = await pool
          .request()
          .input("id", sql.Int(), id)
          .query("SELECT * FROM Cars WHERE Id = @id");
        const car = queryResult.recordset[0];

        response.send(car);
      } else {
        const queryResult = await pool.request().query("SELECT * FROM Cars");
        const cars = queryResult.recordset;

        response.send(cars);
      }
    } catch (err) {
      console.error(err);
      response.status(500).send("An error occured!");
    }
  });

  app.post("/cars", async (request, response) => {
    const car = request.body;

    try {
      const result = await pool
        .request()
        .input("model", sql.NVarChar(256), car.model)
        .input("manufacturer", sql.NVarChar(128), car.manufacturer)
        .input("price", sql.Money(), car.price)
        .input("year", sql.Int(), car.year)
        .query(
          "INSERT INTO Cars (Model, Manufacturer, Price, Year) OUTPUT INSERTED.* VALUES (@model, @manufacturer, @price, @year)"
        );
      console.log(`Affected ${result.rowsAffected} rows after inserting new car`);

      const createdCar = result.recordset.at(0);
      response.status(201).send(createdCar);
    } catch (err) {
      console.error(err);
      response.status(500).send("An error occured!");
    }
  });

  app.put("/cars", async (request, response) => {
    const car = request.body;

    try {
      const result = await pool
        .request()
        .input("id", sql.Int(), car.id)
        .input("model", sql.NVarChar(256), car.model)
        .input("manufacturer", sql.NVarChar(128), car.manufacturer)
        .input("price", sql.Money(), car.price)
        .input("year", sql.Int(), car.year)
        .query(
          "UPDATE Cars SET Model = @model, Manufacturer = @manufacturer, Price = @price, Year = @Year OUTPUT INSERTED.* WHERE Id = @id"
        );
      console.log(`Affected ${result.rowsAffected} rows after updating car`);

      const updatedCar = result.recordset.at(0);
      response.status(201).send(updatedCar);
    } catch (err) {
      console.log(err);
      response.status(500).send("An error occured!");
    }
  });

  app.delete("/cars", async (request, response) => {
    const id = request.body.id;

    try {
      const rowsAffected = (
        await pool.request().input("id", sql.Int(), id).query("DELETE FROM Cars WHERE Id = @id")
      ).rowsAffected;
      console.log(`Affected ${rowsAffected} rows after deleting car`);

      response.sendStatus(204);
    } catch (err) {
      console.log(err);
      response.status(500).send("An error occured!");
    }
  });

  const port = 3000;
  const host = "localhost";
  app.listen(port, host, () => {
    console.log(`Server started at ${host}:${port}`);
  });

  const nodeCleanup = require("node-cleanup");
  nodeCleanup(() => {
    console.log("Closing database connections");
    pool.close();
  });
}

main();
