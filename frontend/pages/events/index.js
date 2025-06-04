import React, { useEffect, useState } from "react";
import { Card, CardContent, Typography, Grid, Container, Alert, CircularProgress } from "@mui/material";

export default function EventsPage() {
  const [nearbyEvents, setNearbyEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch upcoming events
  useEffect(() => {
    fetch("http://localhost:8000/events?upcoming=true")
      .then((res) => res.json())
      .then(setUpcomingEvents)
      .finally(() => setLoading(false));
  }, []);

  // Fetch nearby events
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetch(`http://localhost:8000/events/nearby?latitude=${lat}&longitude=${lon}`)
          .then((res) => res.json())
          .then(setNearbyEvents)
          .catch(() => setNearbyEvents([]));
      },
      (err) => {
        setLocationError("Location permission denied or unavailable.");
        setNearbyEvents([]);
      }
    );
  }, []);

  if (loading) {
    return (
      <Container style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" style={{ padding: '2rem 0' }}>
      {/* Near By Events Section */}
      <Typography variant="h4" component="h2" gutterBottom style={{ marginTop: '2rem' }}>
        Events Near You
      </Typography>
      {locationError && (
        <Alert severity="warning" style={{ marginBottom: '1rem' }}>
          {locationError}
        </Alert>
      )}
      {nearbyEvents.length > 0 ? (
        <Grid container spacing={3}>
          {nearbyEvents.map((event) => (
            <Grid item xs={12} sm={6} md={4} key={event.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h3">
                    {event.title}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    {event.distance} km away
                  </Typography>
                  <Typography variant="body2">
                    {event.location}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {new Date(event.start_date).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : !locationError && (
        <Alert severity="info">
          No events found near your location.
        </Alert>
      )}

      {/* Upcoming Events Section */}
      <Typography variant="h4" component="h2" gutterBottom style={{ marginTop: '2rem' }}>
        Upcoming Events
      </Typography>
      <Grid container spacing={3}>
        {upcomingEvents.map((event) => (
          <Grid item xs={12} sm={6} md={4} key={event.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h3">
                  {event.title}
                </Typography>
                <Typography variant="body2">
                  {event.location}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {new Date(event.start_date).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
} 