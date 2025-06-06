"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MainLayout } from "@/components/layouts/MainLayout";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PaymentDetails {
  eventId: number;
  eventTitle: string;
  numberOfAttendees: number;
  pricePerPerson: number;
  totalAmount: number;
  attendees: Array<{ name: string; age: string; phone: string }>;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(
    null
  );
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [ticketId, setTicketId] = useState("");

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        const token = await getToken();
        const eventId = params.id;
        const attendeesData = JSON.parse(searchParams.get("attendees") || "[]");
        const numberOfAttendees = parseInt(
          searchParams.get("numberOfAttendees") || "0"
        );

        // Fetch event details to get price
        const response = await fetch(`${API_URL}/events/${eventId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch event details");
        }

        const eventData = await response.json();

        setPaymentDetails({
          eventId: eventData.id,
          eventTitle: eventData.title,
          numberOfAttendees,
          pricePerPerson: eventData.price,
          totalAmount: eventData.price * numberOfAttendees,
          attendees: attendeesData,
        });
      } catch (error) {
        console.error("Error fetching payment details:", error);
        toast.error("Failed to load payment details");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [params.id, searchParams, getToken]);

  const handlePayment = async () => {
    // Validate payment form
    if (!cardNumber || !expiryDate || !cvv || !name) {
      toast.error("Please fill in all payment details");
      return;
    }

    if (cardNumber.replace(/\s/g, "").length !== 16) {
      toast.error("Please enter a valid 16-digit card number");
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      toast.error("Please enter a valid expiry date (MM/YY)");
      return;
    }

    if (cvv.length !== 3) {
      toast.error("Please enter a valid 3-digit CVV");
      return;
    }

    try {
      // Generate a unique ticket ID
      const uniqueTicketId = `TKT-${Math.random()
        .toString(36)
        .substr(2, 9)
        .toUpperCase()}`;
      setTicketId(uniqueTicketId);

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Register for the event
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/events/${params.id}/confirm-registration`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            number_of_attendees: paymentDetails?.numberOfAttendees,
            attendees: paymentDetails?.attendees,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to complete registration");
      }

      // Show success dialog
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Payment failed. Please try again.");
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingAnimation />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Complete Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <p>Event: {paymentDetails?.eventTitle}</p>
                  <p>
                    Number of Attendees: {paymentDetails?.numberOfAttendees}
                  </p>
                  <p>Price per Person: ₹{paymentDetails?.pricePerPerson}</p>
                  <div className="border-t pt-2 mt-2">
                    <p className="font-semibold">
                      Total Amount: ₹{paymentDetails?.totalAmount}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardName">Name on Card</Label>
                  <Input
                    id="cardName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    value={cardNumber}
                    onChange={(e) =>
                      setCardNumber(formatCardNumber(e.target.value))
                    }
                    maxLength={19}
                    placeholder="1234 5678 9012 3456"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      value={expiryDate}
                      onChange={(e) =>
                        setExpiryDate(formatExpiryDate(e.target.value))
                      }
                      maxLength={5}
                      placeholder="MM/YY"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      type="password"
                      value={cvv}
                      onChange={(e) =>
                        setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))
                      }
                      maxLength={3}
                      placeholder="123"
                    />
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  Pay ₹{paymentDetails?.totalAmount}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">
                Payment Successful!
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4 py-6">
              <div className="rounded-full bg-green-100 p-3">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">Ticket ID: {ticketId}</p>
                <p>Number of Attendees: {paymentDetails?.numberOfAttendees}</p>
              </div>
              <Button
                onClick={() => router.push(`/events/${params.id}`)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                Back to Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
