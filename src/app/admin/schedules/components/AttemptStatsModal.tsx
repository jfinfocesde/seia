'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, Users, Clock, Target, Award, X } from 'lucide-react';

interface Submission {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  score: number | null;
  submittedAt: string | null;
  fraudAttempts: number;
  timeOutsideEval: number;
}

type SubmissionData = Omit<Submission, 'submittedAt'> & { submittedAt: Date | null };

interface Attempt {
  id: number;
  evaluationId: number;
  uniqueCode: string;
  startTime: Date;
  endTime: Date;
  maxSubmissions?: number | null;
  evaluation?: {
    title: string;
  };
  _count: {
    submissions: number;
  };
}

interface AttemptStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempt: Attempt;
}

export function AttemptStatsModal({ isOpen, onClose, attempt }: AttemptStatsModalProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const { getSubmissionsByAttempt } = await import('../actions');
      const submissionsData = await getSubmissionsByAttempt(attempt.id);

      const transformedSubmissions: Submission[] = submissionsData.map((sub: SubmissionData) => ({
        ...sub,
        submittedAt: sub.submittedAt?.toISOString() || null,
      }));

      setSubmissions(transformedSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  }, [attempt.id]);

  useEffect(() => {
    if (isOpen) {
      fetchSubmissions();
    }
  }, [isOpen, fetchSubmissions]);

  const formatDecimal = (value: number) => Math.round(value * 10) / 10;

  const totalSubmissions = submissions.length;
  const submittedCount = submissions.filter(s => s.submittedAt).length;
  const averageScore = submittedCount > 0
    ? submissions.filter(s => s.score !== null).reduce((acc, s) => acc + (s.score || 0), 0) / submittedCount
    : 0;
  const fraudAttempts = submissions.reduce((acc, s) => acc + s.fraudAttempts, 0);
  const totalTimeOutside = submissions.reduce((acc, s) => acc + s.timeOutsideEval, 0);

  const participantsData = submissions.map(sub => ({
    name: `${sub.firstName} ${sub.lastName}`,
    score: formatDecimal(sub.score || 0),
    fraudAttempts: sub.fraudAttempts,
    timeOutside: formatDecimal(sub.timeOutsideEval / 60),
    submitted: sub.submittedAt ? 'Enviado' : 'Pendiente',
  }));

  const gradeDistribution = [
    { name: 'Excelente (4.5-5.0)', value: submissions.filter(s => s.score !== null && s.score >= 4.5).length, color: '#10b981' },
    { name: 'Muy Bueno (4.0-4.4)', value: submissions.filter(s => s.score !== null && s.score >= 4.0 && s.score < 4.5).length, color: '#3b82f6' },
    { name: 'Bueno (3.5-3.9)', value: submissions.filter(s => s.score !== null && s.score >= 3.5 && s.score < 4.0).length, color: '#f59e0b' },
    { name: 'Regular (3.0-3.4)', value: submissions.filter(s => s.score !== null && s.score >= 3.0 && s.score < 3.5).length, color: '#f97316' },
    { name: 'Insuficiente (0.0-2.9)', value: submissions.filter(s => s.score !== null && s.score < 3.0).length, color: '#ef4444' },
    { name: 'Sin calificar', value: submissions.filter(s => s.score === null).length, color: '#6b7280' },
  ].filter(item => item.value > 0);

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen h-screen max-w-none">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Estadísticas - {attempt.evaluation?.title}
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Cargando estadísticas...</div>
          </div>
        ) : (
          <div className="space-y-6 h-full overflow-y-auto">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Envíos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalSubmissions}</div>
                  <p className="text-xs text-muted-foreground">
                    Código: {attempt.uniqueCode}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Promedio</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatDecimal(averageScore)}</div>
                  <p className="text-xs text-muted-foreground">
                    Puntuación promedio
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Intentos de Fraude</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fraudAttempts}</div>
                  <p className="text-xs text-muted-foreground">
                    Total detectados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tiempo Fuera</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatDecimal(totalTimeOutside / 60)}m</div>
                  <p className="text-xs text-muted-foreground">
                    Total acumulado
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos principales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de barras - Todos los participantes */}
              <Card>
                <CardHeader>
                  <CardTitle>Puntuaciones por Participante</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={participantsData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        fontSize={12}
                      />
                      <YAxis domain={[0, 5]} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [`${value.toFixed(1)}`, name === 'score' ? 'Calificación' : name]}
                        labelFormatter={(label: string) => `Estudiante: ${label}`}
                      />
                      <Bar dataKey="score" fill="#3b82f6" name="Calificación" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gráfico de torta - Distribución de calificaciones */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Calificaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={gradeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: { name: string, percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {gradeDistribution.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} estudiante(s)`, 'Cantidad']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Lista detallada de participantes */}
            <Card>
              <CardHeader>
                <CardTitle>Detalle de Participantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {participantsData.map((participant, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{participant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {participant.submitted} • {participant.timeOutside} min fuera
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-sm">
                          {participant.score} pts
                        </Badge>
                        {participant.fraudAttempts > 0 && (
                          <Badge variant="destructive" className="text-sm">
                            {participant.fraudAttempts} fraude
                          </Badge>
                        )}
                        {participant.submitted === 'Pendiente' && (
                          <Badge variant="outline" className="text-sm">
                            Pendiente
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 