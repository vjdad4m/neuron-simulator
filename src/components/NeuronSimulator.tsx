'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function NeuronSimulator() {
    // Existing state variables
    const [membranePotential, setMembranePotential] = useState(0)
    const [threshold, setThreshold] = useState(1.0)
    const [time, setTime] = useState(0)
    const [dataPoints, setDataPoints] = useState<{ time: number; potential: number; threshold: number }[]>([])
    const [spikeCount, setSpikeCount] = useState(0)
    const [spikeTimes, setSpikeTimes] = useState<number[]>([])
    const [isRunning, setIsRunning] = useState(true)
    const [decayRate, setDecayRate] = useState(0.01)
    const [thresholdDecayRate, setThresholdDecayRate] = useState(0.01)
    const [minThreshold, setMinThreshold] = useState(1.0)
    const [spikeMagnitude, setSpikeMagnitude] = useState(0.5)
    const [showThreshold, setShowThreshold] = useState(true)

    // New state variables
    const [showMembranePotential, setShowMembranePotential] = useState(true)
    const [customSpikeInput, setCustomSpikeInput] = useState('')
    const [useLogScale, setUseLogScale] = useState(false)
    const [potentialColor, setPotentialColor] = useState('#8884d8')

    // Existing simulation parameters
    const refractoryPeriod = 5
    const timeStep = 1
    const MAX_SPIKES_DISPLAY = 20
    const MAX_DATA_POINTS = 1000

    // Existing refs
    const membranePotentialRef = useRef<number>(membranePotential)
    const thresholdRef = useRef<number>(threshold)
    const lastSpikeTimeRef = useRef<number | null>(null)
    const animationFrameRef = useRef<number | null>(null)

    // Existing useEffects for ref updates
    useEffect(() => {
        membranePotentialRef.current = membranePotential
    }, [membranePotential])

    useEffect(() => {
        thresholdRef.current = threshold
    }, [threshold])

    // Existing memoized values and functions
    const isRefractory = useMemo(() => {
        if (lastSpikeTimeRef.current === null) return false
        return time - lastSpikeTimeRef.current < refractoryPeriod
    }, [time])

    const sendSpike = useCallback(() => {
        if (isRefractory) return

        setMembranePotential((prevPotential) => {
            const newPotential = prevPotential + spikeMagnitude
            if (newPotential >= thresholdRef.current) {
                const spikeTime = time
                lastSpikeTimeRef.current = spikeTime
                setThreshold((prevThreshold) => prevThreshold + 0.1)
                setSpikeCount((prev) => prev + 1)
                setSpikeTimes((prevSpikeTimes) => {
                    const updatedSpikeTimes = [...prevSpikeTimes, spikeTime]
                    if (updatedSpikeTimes.length > MAX_SPIKES_DISPLAY) {
                        updatedSpikeTimes.shift()
                    }
                    return updatedSpikeTimes
                })
                return 0
            }
            return newPotential
        })
    }, [isRefractory, spikeMagnitude, time])

    // Existing simulation loop
    const simulationLoop = useCallback(() => {
        if (!isRunning) return

        setTime((prevTime) => {
            const newTime = prevTime + timeStep
            const timeSinceLastSpike = lastSpikeTimeRef.current !== null ? newTime - lastSpikeTimeRef.current : Infinity
            const currentlyRefractory = timeSinceLastSpike < refractoryPeriod

            if (!currentlyRefractory) {
                setThreshold((prevThreshold) => Math.max(minThreshold, prevThreshold - thresholdDecayRate))
            }

            setMembranePotential((prevPotential) => {
                const decayedPotential = Math.max(0, prevPotential - decayRate * timeStep)
                return decayedPotential
            })

            setDataPoints((prevData) => {
                const newData = [
                    ...prevData,
                    { time: newTime, potential: membranePotentialRef.current, threshold: thresholdRef.current },
                ]
                return newData.slice(-MAX_DATA_POINTS)
            })

            return newTime
        })

        animationFrameRef.current = requestAnimationFrame(simulationLoop)
    }, [isRunning, timeStep, refractoryPeriod, decayRate, thresholdDecayRate, minThreshold])

    useEffect(() => {
        if (isRunning) {
            animationFrameRef.current = requestAnimationFrame(simulationLoop)
        } else if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [isRunning, simulationLoop])

    // New function to reset the simulation
    const resetSimulation = useCallback(() => {
        setMembranePotential(0)
        setThreshold(1.0)
        setTime(0)
        setDataPoints([])
        setSpikeCount(0)
        setSpikeTimes([])
        lastSpikeTimeRef.current = null
    }, [])

    // New function to handle custom spike input
    const handleCustomSpikeInput = useCallback(() => {
        const customMagnitude = parseFloat(customSpikeInput)
        if (!isNaN(customMagnitude)) {
            setMembranePotential((prevPotential) => {
                const newPotential = prevPotential + customMagnitude
                if (newPotential >= thresholdRef.current) {
                    const spikeTime = time
                    lastSpikeTimeRef.current = spikeTime
                    setThreshold((prevThreshold) => prevThreshold + 0.1)
                    setSpikeCount((prev) => prev + 1)
                    setSpikeTimes((prevSpikeTimes) => {
                        const updatedSpikeTimes = [...prevSpikeTimes, spikeTime]
                        if (updatedSpikeTimes.length > MAX_SPIKES_DISPLAY) {
                            updatedSpikeTimes.shift()
                        }
                        return updatedSpikeTimes
                    })
                    return 0
                }
                return newPotential
            })
            setCustomSpikeInput('')
        }
    }, [customSpikeInput, time])

    // Compute y-axis maximum value
    const yMax = useMemo(() => Math.max(threshold + 1, 5), [threshold])

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Neuron Simulator</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center mb-4 space-x-4">
                    <Button onClick={sendSpike} disabled={isRefractory}>
                        {isRefractory ? 'Refractory...' : 'Send Spike'}
                    </Button>
                    <Button onClick={() => setIsRunning(!isRunning)}>
                        {isRunning ? 'Pause' : 'Resume'}
                    </Button>
                    <Button onClick={resetSimulation}>Reset</Button>
                    <span className="text-sm">Total Spikes Sent: {spikeCount}</span>
                </div>
                <div className="mb-4 space-y-4">
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="decay-rate">Decay Rate: {decayRate.toFixed(3)}</Label>
                        <Slider
                            id="decay-rate"
                            min={0.001}
                            max={0.1}
                            step={0.001}
                            value={[decayRate]}
                            onValueChange={(value) => setDecayRate(value[0])}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="threshold-decay-rate">Threshold Decay Rate: {thresholdDecayRate.toFixed(3)}</Label>
                        <Slider
                            id="threshold-decay-rate"
                            min={0.001}
                            max={0.1}
                            step={0.001}
                            value={[thresholdDecayRate]}
                            onValueChange={(value) => setThresholdDecayRate(value[0])}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="min-threshold">Min Threshold: {minThreshold.toFixed(3)}</Label>
                        <Slider
                            id="min-threshold"
                            min={0.001}
                            max={2.5}
                            step={0.001}
                            value={[minThreshold]}
                            onValueChange={(value) => setMinThreshold(value[0])}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="spike-magnitude">Spike Magnitude: {spikeMagnitude.toFixed(2)}</Label>
                        <Slider
                            id="spike-magnitude"
                            min={0.1}
                            max={1}
                            step={0.1}
                            value={[spikeMagnitude]}
                            onValueChange={(value) => setSpikeMagnitude(value[0])}
                        />
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="show-threshold"
                                checked={showThreshold}
                                onCheckedChange={setShowThreshold}
                            />
                            <Label htmlFor="show-threshold">Show Threshold</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="show-membrane-potential"
                                checked={showMembranePotential}
                                onCheckedChange={setShowMembranePotential}
                            />
                            <Label htmlFor="show-membrane-potential">Show Membrane Potential</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="use-log-scale"
                                checked={useLogScale}
                                onCheckedChange={setUseLogScale}
                            />
                            <Label htmlFor="use-log-scale">Use Log Scale</Label>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Input
                            type="number"
                            placeholder="Custom spike magnitude"
                            value={customSpikeInput}
                            onChange={(e) => setCustomSpikeInput(e.target.value)}
                        />
                        <Button onClick={handleCustomSpikeInput}>Send Custom Spike</Button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="potential-color">Potential Color:</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="potential-color"
                                    variant="outline"
                                    className="w-[80px] h-[25px] p-0"
                                    style={{ backgroundColor: potentialColor }}
                                />
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px]">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Choose Color</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Select a color for the membrane potential line.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        {['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'].map((color) => (
                                            <Button
                                                key={color}
                                                className="w-full h-8 p-0"
                                                style={{ backgroundColor: color }}
                                                onClick={() => setPotentialColor(color)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <div className="h-[400px] w-full">
                    <LineChart
                        width={800}
                        height={400}
                        data={dataPoints}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="time"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(value) => Math.floor(value).toString()}
                        />
                        <YAxis domain={[0, yMax]} scale={useLogScale ? 'sqrt' : 'auto'} />
                        <Tooltip />
                        <Legend />
                        {showMembranePotential && (
                            <Line type="monotone" dataKey="potential" stroke={potentialColor} dot={false} />
                        )}
                        {showThreshold && (
                            <Line type="monotone" dataKey="threshold" stroke="#82ca9d" dot={false} strokeDasharray="5 5" />
                        )}
                        {spikeTimes.map((spikeTime, index) => (
                            <ReferenceLine
                                key={index}
                                x={spikeTime}
                                stroke="red"
                                label={{ value: `Spike ${index + 1}`, position: 'top' }}
                            />
                        ))}
                    </LineChart>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                    <p>Membrane Potential: {membranePotential.toFixed(2)}</p>
                    <p>Threshold: {threshold.toFixed(2)}</p>
                    <p>Time: {time}</p>
                    <p>
                        {lastSpikeTimeRef.current !== null
                            ? `Time since last spike: ${time - lastSpikeTimeRef.current}`
                            : 'No spikes yet'}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
